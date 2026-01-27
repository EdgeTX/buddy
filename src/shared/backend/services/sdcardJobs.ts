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
        updateStageStatus(jobId, "write", { error: e.message });
      });
  })().catch(() => {
    // Error handled above
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
            const error = e as Error;
            // Handle stale file system handles or file already deleted
            if (
              error.message.includes(
                "An operation that depends on state cached in an interface object"
              ) ||
              error.name === "NotFoundError"
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
