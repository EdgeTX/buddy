import { ZipEntry } from "unzipit";
import { PubSub } from "graphql-subscriptions";
import debounce from "debounce";
import pLimit from "p-limit";
import * as uuid from "uuid";
import {
  SdcardWriteFileStatus,
  SdcardWriteJob,
  SdcardWriteJobStages,
} from "shared/backend/graph/__generated__";
import { Context } from "shared/backend/context";

export const jobUpdates = new PubSub();
const sdcardJobs: Record<string, SdcardWriteJob> = {};

export const createSdcardJob = (
  stages: (keyof Omit<SdcardWriteJobStages, "__typename">)[]
): SdcardWriteJob => {
  const id = uuid.v1();
  const job: SdcardWriteJob = {
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
    ) as unknown as SdcardWriteJobStages,
  };
  sdcardJobs[id] = job;
  return job;
};

export const getSdcardJob = (jobId: string): SdcardWriteJob | undefined =>
  sdcardJobs[jobId];

export const startExecution = async (
  jobId: string,
  args: {
    assetUrls: string[];
    directoryHandle: FileSystemDirectoryHandle;
    clean: boolean;
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
        console.error(e);
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
      console.log("cleaning");

      updateStageStatus(jobId, "erase", { started: true });

      const success = await erase(
        args.directoryHandle,
        () => !isCancelled(jobId),
        (progress) => {
          updateStageStatus(jobId, "erase", { progress });
        }
      )
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

const updateSdcardJob = (jobId: string, updatedJob: SdcardWriteJob): void => {
  sdcardJobs[jobId] = updatedJob;
  void debouncedPublish(jobId, updatedJob);
};

const updateStageStatus = <
  S extends keyof Omit<SdcardWriteJobStages, "__typename">
>(
  jobId: string,
  stage: S,
  status: Partial<Omit<NonNullable<SdcardWriteJobStages[S]>, "__typename">>
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
  status: Partial<Pick<SdcardWriteFileStatus, "startTime" | "completedTime">>
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
        ...(status as SdcardWriteFileStatus),
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
  shouldContinue?: () => boolean,
  onProgress?: (progress: number) => void
): Promise<void> => {
  let progress = 0;

  const entries: FileSystemHandle[] = [];

  // This is only offered as an async interaor
  // so we have to unpack :(
  // eslint-disable-next-line no-restricted-syntax
  for await (const entry of rootHandle.values()) {
    if (shouldContinue && !shouldContinue()) {
      return;
    }
    entries.push(entry);
  }

  await Promise.all(
    entries.map(async (entry) => {
      if (shouldContinue && !shouldContinue()) {
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
      onProgress?.((progress / entries.length) * 100);
    })
  );
};

/**
 * Write the provided zip assets to the
 */
const writeAssets = async (
  rootHandle: FileSystemDirectoryHandle,
  zipEntries: ZipEntry[],
  shouldContinue?: () => boolean,
  updates?: {
    onFileWriteStarted?: (name: string) => void;
    onFileWriteCompleted?: (name: string) => void;
    onProgress?: (progress: number) => void;
  }
): Promise<void> => {
  const total = zipEntries.reduce((acc, entity) => acc + entity.size, 0);
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
                    throw e;
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
};
