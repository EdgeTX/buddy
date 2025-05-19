// shared/backend/services/sdcardJobs.ts
import { ZipEntry } from "unzipit";
import { PubSub } from "graphql-subscriptions";
import debounce from "debounce";
import pLimit from "p-limit";
import * as uuid from "uuid";
import type { Context } from "shared/backend/context";
import { isNotUndefined } from "type-guards";
import type {
  SdcardWriteFileStatusType,
  SdcardWriteJobStagesType,
  SdcardWriteJobType,
} from "shared/backend/graph/sdcard";
import { arrayFromAsync } from "shared/tools";
import JSZip from "jszip";
import * as yaml from "js-yaml";

type WriteMeta = {
  pack?: {
    version?: string;
    target?: string;
  };
  sounds?: {
    version?: string;
  };
};

export const jobUpdates = new PubSub();
const sdcardJobs: Record<string, SdcardWriteJobType> = {};

const NO_ERASE_DIRECTORIES = ["RADIO", "MODELS", "EEPROM"];

export const createSdcardJob = (
  stages: (keyof SdcardWriteJobStagesType)[]
): SdcardWriteJobType => {
  const id = uuid.v1();
  const job: SdcardWriteJobType = {
    id,
    cancelled: false,
    stages: Object.fromEntries(
      stages.map((stage) => [
        stage,
        {
          started: false,
          completed: false,
          progress: 0,
          ...(stage === "write" ? { writes: [] } : undefined),
        },
      ])
    ) as unknown as SdcardWriteJobStagesType,
  };
  sdcardJobs[id] = job;
  return job;
};

export const getSdcardJob = (jobId: string): SdcardWriteJobType | undefined =>
  sdcardJobs[jobId];

export const startExecution = async (
  jobId: string,
  args: {
    assetUrls: string[];
    directoryHandle: FileSystemDirectoryHandle;
    clean: boolean | string[];
    writeMeta?: WriteMeta;
  },
  { sdcardAssets }: Context
): // This may at some poit require async use, so ignore
// this weird signature
// eslint-disable-next-line @typescript-eslint/require-await
Promise<void> => {
  (async () => {
    /** Download */
    updateStageStatus(jobId, "download", {
      started: true,
    });

    const zipEntries = await sdcardAssets
      .downloadContents(args.assetUrls, (progress) => {
        updateStageStatus(jobId, "download", {
          progress,
        });
      })
      .then((entries) => {
        updateStageStatus(jobId, "download", {
          completed: true,
        });
        return entries;
      })
      .catch((e: Error) => {
        updateStageStatus(jobId, "download", {
          error: e.message,
        });

        return undefined;
      });

    if (isCancelled(jobId) || !zipEntries) {
      return;
    }

    /** Clean */
    if (args.clean) {
      updateStageStatus(jobId, "erase", { started: true });

      const success = await erase(args.directoryHandle, {
        specificDirectories: Array.isArray(args.clean) ? args.clean : undefined,
        shouldContinue: () => !isCancelled(jobId),
        onProgress: (progress) => {
          updateStageStatus(jobId, "erase", { progress });
        },
      })
        .then(() => {
          updateStageStatus(jobId, "erase", { completed: true });
          return true;
        })
        .catch((e: Error) => {
          console.error(e);
          updateStageStatus(jobId, "erase", { error: e.message });
          return false;
        });

      if (!success) {
        return;
      }
    }

    if (isCancelled(jobId)) {
      return;
    }

    /** Write */
    updateStageStatus(jobId, "write", { started: true });

    await writeAssets(
      args.directoryHandle,
      zipEntries,
      args.writeMeta,
      () => !isCancelled(jobId),
      {
        onFileWriteStarted: (name) => {
          updateSdcardWriteFileStatus(jobId, name, {
            startTime: new Date().getTime().toString(),
          });
        },
        onFileWriteCompleted: (name) => {
          updateSdcardWriteFileStatus(jobId, name, {
            completedTime: new Date().getTime().toString(),
          });
        },
        onProgress: (progress) => {
          updateStageStatus(jobId, "write", {
            progress,
          });
        },
      }
    )
      .then(() => {
        updateStageStatus(jobId, "write", { completed: true });
      })
      .catch((e: Error) => {
        console.error(e);
        updateStageStatus(jobId, "write", { error: e.message });
      });
  })().catch((e) => {
    console.error(e);
    cancelSdcardJob(jobId);
  });
};

export const cancelSdcardJob = (jobId: string): void => {
  const job = getSdcardJob(jobId);
  if (!job) {
    return;
  }

  updateSdcardJob(jobId, { ...job, cancelled: true });
};

const debouncedPublish = debounce(jobUpdates.publish.bind(jobUpdates), 10);

const updateSdcardJob = (
  jobId: string,
  updatedJob: SdcardWriteJobType
): void => {
  sdcardJobs[jobId] = updatedJob;
  void debouncedPublish(jobId, updatedJob);
};

const updateStageStatus = <S extends keyof SdcardWriteJobStagesType>(
  jobId: string,
  stage: S,
  status: Partial<NonNullable<SdcardWriteJobStagesType[S]>>
): void => {
  const job = getSdcardJob(jobId);
  if (!job) {
    return;
  }

  updateSdcardJob(jobId, {
    ...job,
    stages: { ...job.stages, [stage]: { ...job.stages[stage], ...status } },
  });
};

const updateSdcardWriteFileStatus = (
  jobId: string,
  fileName: string,
  status: Partial<
    Pick<SdcardWriteFileStatusType, "startTime" | "completedTime">
  >
): void => {
  const job = getSdcardJob(jobId);
  const existing = job?.stages.write.writes.find(
    ({ name }) => name === fileName
  );

  if (!status.startTime && !existing?.startTime) {
    throw new Error("invalid status update, write doesnt have a start time");
  }

  updateStageStatus(jobId, "write", {
    writes: (
      job?.stages.write.writes.filter(({ name }) => name !== fileName) ?? []
    ).concat([
      {
        ...existing,
        ...(status as SdcardWriteFileStatusType),
        name: fileName,
      },
    ]),
  });
};

const isCancelled = (jobId: string): boolean =>
  getSdcardJob(jobId)?.cancelled ?? true;

/**
 * Erase all the files and folders in the given directory
 * handler
 */
const erase = async (
  rootHandle: FileSystemDirectoryHandle,
  options: {
    specificDirectories?: string[];
    shouldContinue?: () => boolean;
    onProgress?: (progress: number) => void;
  }
): Promise<void> => {
  let progress = 0;

  const entries: FileSystemHandle[] = [];

  // This is only offered as an async interaor
  // so we have to unpack :(
  // eslint-disable-next-line no-restricted-syntax
  for await (const entry of rootHandle.values()) {
    if (options.shouldContinue && !options.shouldContinue()) {
      return;
    }
    entries.push(entry);
  }

  await Promise.all(
    entries
      .filter(
        (entry) =>
          !options.specificDirectories ||
          options.specificDirectories.includes(entry.name)
      )
      .filter((entry) => !NO_ERASE_DIRECTORIES.includes(entry.name))
      .map(async (entry) => {
        if (options.shouldContinue && !options.shouldContinue()) {
          return;
        }
        await rootHandle
          .removeEntry(
            entry.name,
            entry.kind === "directory" ? { recursive: true } : undefined
          )
          .catch((e) => {
            // Some weird macos folder
            if (
              (e as Error).message.includes(
                "An operation that depends on state cached in an interface object"
              )
            ) {
              return;
            }
            throw e;
          });
        progress += 1;
        options.onProgress?.((progress / entries.length) * 100);
      })
  );

  options.onProgress?.(100);
};

/**
 * Write the provided zip assets to the
 */
const writeAssets = async (
  rootHandle: FileSystemDirectoryHandle,
  zipEntries: ZipEntry[],
  writeMeta?: WriteMeta,
  shouldContinue?: () => boolean,
  updates?: {
    onFileWriteStarted?: (name: string) => void;
    onFileWriteCompleted?: (name: string) => void;
    onProgress?: (progress: number) => void;
  }
): Promise<void> => {
  const metaFiles = [
    writeMeta?.pack?.version
      ? {
          name: "edgetx.sdcard.version",
          content: Buffer.from(writeMeta.pack.version),
        }
      : undefined,
    writeMeta?.pack?.target
      ? {
          name: "edgetx.sdcard.target",
          content: Buffer.from(writeMeta.pack.target),
        }
      : undefined,
    writeMeta?.sounds?.version
      ? {
          folder: "SOUNDS",
          name: "edgetx.sounds.version",
          content: Buffer.from(writeMeta.sounds.version),
        }
      : undefined,
  ].filter(isNotUndefined);

  const total =
    zipEntries.reduce((acc, entity) => acc + entity.size, 0) +
    metaFiles.reduce((acc, file) => acc + file.content.byteLength, 0);
  let progress = 0;

  const writeLimiter = pLimit(10);

  await Promise.all(
    zipEntries.map(async (entry) => {
      if (shouldContinue && !shouldContinue()) {
        return;
      }

      const path = entry.name.split("/");
      // We know that the list will contain at least 1 item
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const fileName = path[path.length - 1]!;
      const isFolder = fileName.length === 0;
      if (isFolder) {
        updates?.onFileWriteStarted?.(entry.name);
      }

      // ensure the path exists
      // and recursively head down the tree
      // to get to the folder where this file needs
      // to go
      const fileDirectory = await path
        .slice(0, path.length - 1)
        .filter(Boolean)
        .reduce(
          async (prev, directory) =>
            prev.then(async (parentDirectory) => {
              // We will eventually break or crash
              // eslint-disable-next-line no-constant-condition
              while (true) {
                try {
                  // This has to be done in a while loop
                  // eslint-disable-next-line no-await-in-loop
                  return await parentDirectory.getDirectoryHandle(directory, {
                    create: true,
                  });
                } catch (e) {
                  // There is a race condition where node attempts to read the directory
                  // whilst we are creating it. Doesn't happen in browser
                  if (e && (e as Error & { code?: string }).code !== "EEXIST") {
                    throw e as Error;
                  }
                }
              }
            }),
          Promise.resolve(rootHandle)
        );

      if (shouldContinue && !shouldContinue()) {
        return;
      }

      // Only need to save a file if there was something after the folder
      if (!isFolder) {
        const fileHandle = await fileDirectory.getFileHandle(fileName, {
          create: true,
        });
        if (shouldContinue && !shouldContinue()) {
          return;
        }
        const entryData = await entry.arrayBuffer();
        const blob = new Blob([entryData]);

        await writeLimiter(async () => {
          updates?.onFileWriteStarted?.(entry.name);
          const stream = blob.stream() as unknown as ReadableStream;
          return stream.pipeTo(await fileHandle.createWritable());
        });

        progress += entry.size;
      }

      updates?.onProgress?.((progress / total) * 100);
      updates?.onFileWriteCompleted?.(entry.name);
    })
  );

  await Promise.all(
    metaFiles.map(async (metaFile) => {
      const folderHandle = metaFile.folder
        ? await rootHandle.getDirectoryHandle(metaFile.folder, { create: true })
        : rootHandle;

      updates?.onFileWriteStarted?.(metaFile.name);

      const file = await folderHandle
        .getFileHandle(metaFile.name, { create: true })
        .then((handle) => handle.createWritable());
      await file.write(metaFile.content);
      await file.close();

      progress += metaFile.content.byteLength;

      updates?.onProgress?.((progress / total) * 100);
      updates?.onFileWriteCompleted?.(metaFile.name);
    })
  );

  updates?.onProgress?.(100);
};

//* *
//* Assets backup and restore functions
//*
// */

export type ConflictEntry = {
  path: string;
  srcSize: number;
  dstSize: number;
};

export type BackupPlan = {
  toCopy: string[];
  identical: string[];
  conflicts: ConflictEntry[];
};

export type ConflictResolution = {
  path: string;
  action: "OVERWRITE" | "SKIP" | "RENAME";
};

export type ExecutionArgs = {
  sourceHandle: FileSystemDirectoryHandle;
  targetHandle: FileSystemDirectoryHandle;
  filterPaths: string[];
  conflictResolutions?: ConflictResolution[];
  overwrite?: boolean;
  autoRename?: boolean;
};

// --- Utility functions ---
async function listFiles(
  dir: FileSystemDirectoryHandle,
  prefix = ""
): Promise<ZipEntry[]> {
  const entries = await arrayFromAsync(dir.entries());
  const batches = await Promise.all(
    entries.map(async ([entryName, handle]) => {
      const relPath = prefix ? `${prefix}/${entryName}` : entryName;
      if (handle.kind === "file") {
        const file = await handle.getFile();
        return [
          {
            name: relPath,
            arrayBuffer: () => file.arrayBuffer(),
            size: file.size,
            // assuming imported ZipEntry includes needed fields
          } as unknown as ZipEntry,
        ];
      }
      return listFiles(handle, relPath);
    })
  );
  return batches.flat();
}

async function autoRenameName(
  original: string,
  dir: FileSystemDirectoryHandle,
  index = 1
): Promise<string> {
  const dot = original.lastIndexOf(".");
  const base = dot >= 0 ? original.slice(0, dot) : original;
  const ext = dot >= 0 ? original.slice(dot) : "";
  const tryName = `${base}(${index})${ext}`;
  try {
    await dir.getFileHandle(tryName);
    return await autoRenameName(original, dir, index + 1);
  } catch {
    return tryName;
  }
}

function buffersEqual(a: ArrayBuffer, b: ArrayBuffer): boolean {
  if (a.byteLength !== b.byteLength) return false;
  const A = new Uint8Array(a);
  const B = new Uint8Array(b);
  return A.every((v, i) => v === B[i]);
}

async function getParentHandle(
  root: FileSystemDirectoryHandle,
  segments: string[]
): Promise<FileSystemDirectoryHandle> {
  return segments.reduce(
    (prevPromise, seg) =>
      prevPromise.then((p) => p.getDirectoryHandle(seg, { create: false })),
    Promise.resolve(root)
  );
}

async function getOrCreateParentHandle(
  root: FileSystemDirectoryHandle,
  segments: string[]
): Promise<FileSystemDirectoryHandle> {
  return segments.reduce(
    (prev, seg) =>
      prev.then((dir) => dir.getDirectoryHandle(seg, { create: true })),
    Promise.resolve(root)
  );
}

async function compareEntry(
  entry: ZipEntry,
  target: FileSystemDirectoryHandle
): Promise<"NEW" | "IDENTICAL" | ConflictEntry> {
  const parts = entry.name.split("/");
  const fileName = parts.pop()!;
  try {
    // now BOTH missing folders and missing files fall through to 'NEW'
    const parent = await getParentHandle(target, parts);
    const existingHandle = await parent.getFileHandle(fileName, {
      create: false,
    });
    const [srcBuf, existingFile] = await Promise.all([
      entry.arrayBuffer(),
      existingHandle.getFile(),
    ]);
    const dstBuf = await existingFile.arrayBuffer();
    if (buffersEqual(srcBuf, dstBuf)) return "IDENTICAL";
    return {
      path: entry.name,
      srcSize: entry.size,
      dstSize: dstBuf.byteLength,
    };
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "NotFoundError") {
      // either the directory or the file itself wasn’t there, so it’s NEW
      return "NEW";
    }
    // any other error should still bubble up
    throw err;
  }
}

export async function executeSingleCopy(
  entry: ZipEntry,
  targetRoot: FileSystemDirectoryHandle,
  options: { overwrite: boolean; autoRename: boolean }
): Promise<void> {
  const { overwrite, autoRename } = options;
  const segments = entry.name.split("/");
  const fileName = segments.pop()!;
  const parent = await getOrCreateParentHandle(targetRoot, segments);

  let destName = fileName;
  try {
    await parent.getFileHandle(fileName, { create: false });
    if (!overwrite) {
      if (autoRename) {
        destName = await autoRenameName(fileName, parent);
      } else {
        return;
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error) {
      const { name } = err;
      if (name !== "NotFoundError") {
        throw err;
      }
    } else {
      throw err;
    }
  }

  const data = await entry.arrayBuffer();
  const handle = await parent.getFileHandle(destName, { create: true });
  const writer = await handle.createWritable();
  await writer.write(data);
  await writer.close();
}

export async function buildBackupPlan(
  source: FileSystemDirectoryHandle,
  target: FileSystemDirectoryHandle,
  filterPaths: string[]
): Promise<BackupPlan> {
  // 1) Grab every file under the source
  const allEntries = await listFiles(source);

  // 2) Find any model‐YAMLs that reference bitmaps
  const extraImagePaths = new Set<string>();
  await Promise.all(
    filterPaths
      .filter((p) => p.startsWith("MODELS/") && p.endsWith(".yml"))
      .map(async (modelPath) => {
        const entry = allEntries.find((e) => e.name === modelPath);
        if (!entry) return;

        // 1️⃣ load as unknown
        let loaded: unknown;
        try {
          loaded = yaml.load(
            await entry
              .arrayBuffer()
              .then((buf) => new TextDecoder().decode(buf))
          );
        } catch {
          return;
        }

        // 2️⃣ narrow to object
        if (typeof loaded !== "object" || loaded === null) return;
        const doc = loaded as Record<string, unknown>;

        // 3️⃣ check for header
        const hdr = doc.header;
        if (typeof hdr !== "object" || hdr === null) return;
        const header = hdr as Record<string, unknown>;

        // 4️⃣ check for bitmap string
        const maybeBmp = header.bitmap;
        if (typeof maybeBmp !== "string") return;

        // 5️⃣ safe to use
        extraImagePaths.add(`IMAGES/${maybeBmp}`);
      })
  );

  // 3) Build the list of “toConsider” entries:
  //    anything matching the original filterPaths *or* the extra images
  const pathsToMatch = [...filterPaths, ...Array.from(extraImagePaths)];
  const toConsider = allEntries.filter((e) =>
    pathsToMatch.some((p) => e.name === p || e.name.startsWith(`${p}/`))
  );

  // 4) Compare each entry against the target
  const results = await Promise.all(
    toConsider.map(async (entry) => {
      const res = await compareEntry(entry, target);
      return { entry, res };
    })
  );

  // 5) Fold into your plan object
  return results.reduce<BackupPlan>(
    (plan, { entry, res }) => {
      if (res === "IDENTICAL") plan.identical.push(entry.name);
      else if (res === "NEW") plan.toCopy.push(entry.name);
      else plan.conflicts.push(res);
      return plan;
    },
    { toCopy: [], identical: [], conflicts: [] }
  );
}

export async function executeBackupPlan(args: ExecutionArgs): Promise<void> {
  const {
    sourceHandle,
    targetHandle,
    filterPaths,
    conflictResolutions = [],
    overwrite = false,
    autoRename = false,
  } = args;

  const plan = await buildBackupPlan(sourceHandle, targetHandle, filterPaths);
  const resMap = new Map(conflictResolutions.map((r) => [r.path, r.action]));
  const allEntries = await listFiles(sourceHandle);
  const toProc = [...plan.toCopy, ...plan.conflicts.map((c) => c.path)];

  await Promise.all(
    toProc.map(async (path) => {
      const entry = allEntries.find((e) => e.name === path);
      if (!entry) return;
      const action = resMap.get(path);
      if (
        plan.conflicts.some((c) => c.path === path) &&
        action !== "OVERWRITE" &&
        action !== "RENAME" &&
        !overwrite
      )
        return;

      const parts = path.split("/");
      const name = parts.pop() ?? "";
      const parent = await getParentHandle(targetHandle, parts);
      const dest =
        action === "RENAME" ||
        (!action && autoRename && plan.conflicts.some((c) => c.path === path))
          ? await autoRenameName(name, parent)
          : name;

      const data = await entry.arrayBuffer();
      const handle = await parent.getFileHandle(dest, { create: true });
      const writer = await handle.createWritable();
      await writer.write(data);
      await writer.close();
    })
  );
}

export async function exportBackupToZip(
  sourceHandle: FileSystemDirectoryHandle,
  filterPaths: string[]
): Promise<Blob> {
  const all = await listFiles(sourceHandle);
  const filtered = all.filter((e) =>
    filterPaths.some((p) => e.name === p || e.name.startsWith(`${p}/`))
  );
  const zip = new JSZip();
  await Promise.all(
    filtered.map(async (e) => zip.file(e.name, await e.arrayBuffer()))
  );
  return zip.generateAsync({ type: "blob" });
}

export async function restoreFromZip(
  zipData: Blob | ArrayBuffer,
  targetHandle: FileSystemDirectoryHandle,
  conflictResolutions: ConflictResolution[] = [],
  overwrite = false,
  autoRename = false
): Promise<void> {
  const zip = new JSZip();
  const raw = zipData instanceof Blob ? await zipData.arrayBuffer() : zipData;
  const loaded = await zip.loadAsync(raw);

  const entries = (
    await Promise.all(
      Object.entries(loaded.files).map(async ([path, ze]) => {
        if (ze.dir) return null;
        const buf = await ze.async("arraybuffer");
        return {
          name: path,
          arrayBuffer: () => Promise.resolve(buf),
          size: buf.byteLength,
        } as ZipEntry;
      })
    )
  ).filter((x): x is ZipEntry => x != null);

  const plan: BackupPlan = await entries.reduce<Promise<BackupPlan>>(
    async (pP, entry) => {
      const p = await pP;
      const cmp = await compareEntry(entry, targetHandle);
      if (cmp === "IDENTICAL") p.identical.push(entry.name);
      else if (cmp === "NEW") p.toCopy.push(entry.name);
      else p.conflicts.push(cmp);
      return p;
    },
    Promise.resolve({ toCopy: [], identical: [], conflicts: [] })
  );

  const resMap = new Map(conflictResolutions.map((r) => [r.path, r.action]));
  const toProc = [...plan.toCopy, ...plan.conflicts.map((c) => c.path)];

  await Promise.all(
    toProc.map(async (path) => {
      const entry = entries.find((e) => e.name === path);
      if (!entry) return;
      const action = resMap.get(path);
      if (
        plan.conflicts.some((c) => c.path === path) &&
        action !== "OVERWRITE" &&
        action !== "RENAME" &&
        !overwrite
      )
        return;

      const parts = path.split("/");
      const name = parts.pop() ?? "";
      const parent = await getParentHandle(targetHandle, parts);
      const dest =
        action === "RENAME" ||
        (!action && autoRename && plan.conflicts.some((c) => c.path === path))
          ? await autoRenameName(name, parent)
          : name;

      const data = await entry.arrayBuffer();
      const handle = await parent.getFileHandle(dest, { create: true });
      const writer = await handle.createWritable();
      await writer.write(data);
      await writer.close();
    })
  );
}

export const startAssetsExecution = async (
  jobId: string,
  args: ExecutionArgs
): Promise<void> => {
  try {
    console.log(`[${jobId}] ▶️ startAssetsExecution invoked`);
    console.log(`[${jobId}] 🔽 Download & compare: initializing @0%`);
    updateStageStatus(jobId, "download", { started: true, progress: 0 });

    const plan = await buildBackupPlan(
      args.sourceHandle,
      args.targetHandle,
      args.filterPaths
    );
    console.log(
      `[${jobId}] ⚙️ buildBackupPlan complete: toCopy=${plan.toCopy.length}, conflicts=${plan.conflicts.length}`
    );

    console.log(`[${jobId}] 🔽 Download & compare: marking completed @100%`);
    updateStageStatus(jobId, "download", { progress: 1, completed: true });

    const toProc = [...plan.toCopy, ...plan.conflicts.map((c) => c.path)];
    const total = toProc.length;
    console.log(`[${jobId}] ✏️ Write pass: ${total} files to process`);

    type WriteRecord = {
      name: string;
      startTime: string;
      completedTime: string | null;
    };
    const writes: WriteRecord[] = [];

    console.log(`[${jobId}] ✏️ Write pass: initializing write stage @0%`);
    updateStageStatus(jobId, "write", {
      started: true,
      completed: false,
      progress: 0,
      writes,
    });

    const allEntries = await listFiles(args.sourceHandle);
    console.log(
      `[${jobId}] ✏️ Write pass: listFiles found ${allEntries.length} entries`
    );

    let doneCount = 0;

    await toProc.reduce<Promise<void>>(
      (chain, currentPath, index) =>
        chain.then(async () => {
          console.log(
            `[${jobId}]   • (${index + 1}/${total}) starting "${currentPath}"`
          );

          const startTime = new Date().toISOString();
          const record: WriteRecord = {
            name: currentPath,
            startTime,
            completedTime: null,
          };
          writes.push(record);

          console.log(
            `[${jobId}]     → updateStageStatus('write', { writes }) [file start]`
          );
          updateStageStatus(jobId, "write", { writes });

          const entry = allEntries.find((e) => e.name === currentPath);
          if (entry) {
            await executeSingleCopy(entry, args.targetHandle, {
              overwrite: args.overwrite ?? false,
              autoRename: args.autoRename ?? false,
            });
          }

          record.completedTime = new Date().toISOString();
          doneCount += 1;
          const progress = doneCount / total;

          console.log(
            `[${jobId}]     ✔️ finished "${currentPath}" — progress=${(
              progress * 100
            ).toFixed(1)}%`
          );
          console.log(
            `[${jobId}]     → updateStageStatus('write', { writes, progress: ${progress.toFixed(
              2
            )} })`
          );
          updateStageStatus(jobId, "write", { writes, progress });
        }),
      Promise.resolve()
    );

    console.log(
      `[${jobId}] ✏️ Write pass: all files done, marking completed @100%`
    );
    updateStageStatus(jobId, "write", {
      completed: true,
      progress: 1,
      writes,
    });

    console.log(`[${jobId}] ✅ startAssetsExecution finished successfully`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[${jobId}] ❗️ Error in startAssetsExecution: ${msg}`);
    updateStageStatus(jobId, "write", { error: msg });
    cancelSdcardJob(jobId);
  }
};
