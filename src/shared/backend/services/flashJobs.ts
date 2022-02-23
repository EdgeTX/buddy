import debounce from "debounce";
import { WebDFU } from "dfu";
import { PubSub } from "graphql-subscriptions";
import * as uuid from "uuid";
import type { Context } from "shared/backend/context";
import type {
  FlashJobType,
  FlashStageType,
  FlashStagesType,
  FlashJobMetaType,
} from "shared/backend/graph/flash";

export const jobUpdates = new PubSub();

const jobs: Record<string, FlashJobType> = {};

export const createJob = (
  stages: (keyof FlashStagesType)[],
  meta: FlashJobMetaType
): FlashJobType => {
  const id = uuid.v1();
  const job: FlashJobType = {
    id,
    cancelled: false,
    meta,
    stages: Object.fromEntries(
      stages.map((stage) => [
        stage,
        {
          started: false,
          completed: false,
          progress: 0,
        },
      ])
    ) as unknown as FlashStagesType,
  };
  jobs[id] = job;
  return job;
};

export const startExecution = async (
  jobId: string,
  args: {
    device: USBDevice;
    firmware: { data?: Buffer; url?: string; target: string };
  },
  { dfu, firmwareStore }: Context
): Promise<void> => {
  let firmwareData = args.firmware.data;
  let dfuProcess: WebDFU | undefined;

  const cleanUp = async (): Promise<void> => {
    if (dfuProcess) {
      await dfuProcess.close().catch(() => {});
      dfuProcess = undefined;
      await args.device.close().catch(() => {});
    }
    if (cancelledListener) {
      jobUpdates.unsubscribe(cancelledListener);
      cancelledListener = undefined;
    }
  };

  let cancelledListener: number | undefined = await jobUpdates.subscribe(
    jobId,
    async (updatedJob: FlashJobType) => {
      if (updatedJob.cancelled) {
        await cleanUp();
      }
    }
  );

  // Run job
  (async () => {
    updateStageStatus(jobId, "connect", {
      started: true,
    });

    dfuProcess = await dfu.connect(args.device).catch((e: Error) => {
      updateStageStatus(jobId, "connect", {
        error: e.message,
      });
      return undefined;
    });

    if (!dfuProcess || isCancelled(jobId)) {
      return;
    }

    updateStageStatus(jobId, "connect", {
      completed: true,
    });

    if (!firmwareData) {
      updateStageStatus(jobId, "download", {
        started: true,
      });

      firmwareData = await firmwareStore
        // We are relying on this already being checked
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        .fetchFirmware(args.firmware.url!, args.firmware.target)
        .catch((e: Error) => {
          updateStageStatus(jobId, "download", {
            error: e.message,
          });
          return undefined;
        });

      if (!firmwareData || isCancelled(jobId)) {
        return;
      }

      updateStageStatus(jobId, "download", {
        completed: true,
        progress: 100,
      });
    }

    await flash(jobId, dfuProcess, firmwareData);
  })()
    .catch((e) => {
      console.error(e);
    })
    .finally(async () => {
      await cleanUp();
    });
};

export const getJob = (jobId: string): FlashJobType | undefined => jobs[jobId];

const isCancelled = (jobId: string): boolean => jobs[jobId]?.cancelled ?? true;

const debouncedPublish = debounce(jobUpdates.publish.bind(jobUpdates), 10);

export const updateJob = (jobId: string, updatedJob: FlashJobType): void => {
  jobs[jobId] = updatedJob;
  void debouncedPublish(jobId, updatedJob);
};

export const updateStageStatus = (
  jobId: string,
  stage: keyof FlashStagesType,
  status: Partial<FlashStageType>
): void => {
  const job = getJob(jobId);
  if (!job) {
    return;
  }

  updateJob(jobId, {
    ...job,
    stages: { ...job.stages, [stage]: { ...job.stages[stage], ...status } },
  });
};

export const cancelJob = (jobId: string): void => {
  const job = getJob(jobId);
  if (!job) {
    return;
  }

  updateJob(jobId, { ...job, cancelled: true });
};

export const flash = async (
  jobId: string,
  connection: WebDFU,
  firmware: Buffer
): Promise<void> => {
  const process = connection.write(
    connection.properties?.TransferSize ?? 1024,
    firmware,
    true
  );

  await new Promise<void>((resolve, reject) => {
    let stage: "erase" | "flash" | "finished" = "erase";
    process.events.on("error", (err: Error) => {
      // We've already assumed flashing is finished
      // so don't notify any errors
      if (stage === "finished") {
        return;
      }

      if (stage === "erase") {
        updateStageStatus(jobId, "erase", {
          error: err.message,
        });
      } else {
        updateStageStatus(jobId, "flash", {
          error: err.message,
        });
      }
      reject(err);
    });

    process.events.on("erase/start", () => {
      updateStageStatus(jobId, "erase", {
        started: true,
      });
    });
    process.events.on("erase/process", (progress, size) => {
      updateStageStatus(jobId, "erase", {
        progress: (progress / size) * 100,
      });
    });
    process.events.on("erase/end", () => {
      updateStageStatus(jobId, "erase", {
        progress: 100,
        completed: true,
      });
    });

    process.events.on("write/start", () => {
      stage = "flash";
      updateStageStatus(jobId, "flash", {
        started: true,
      });
    });
    process.events.on("write/process", (progress, size) => {
      updateStageStatus(jobId, "flash", {
        progress: (progress / size) * 100,
      });
    });

    let writeEndTimeout: NodeJS.Timeout;

    const finish = (): void => {
      stage = "finished";
      updateStageStatus(jobId, "flash", {
        completed: true,
      });
      resolve();
    };

    process.events.on("write/end", () => {
      // For some reason there is a cercumstance
      // where the write process finishes, but we don't
      // trigger the "end" event because the device doesn't
      // ever go into a state which the library we are using
      // expects it to go into
      writeEndTimeout = setTimeout(() => {
        void connection.close().catch(() => {});
        finish();
      }, 1000);
    });

    process.events.on("end", () => {
      clearTimeout(writeEndTimeout);
      finish();
    });
  });
};
