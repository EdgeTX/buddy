import debounce from "debounce";
import { WebDFU } from "dfu";
import { PubSub } from "graphql-subscriptions";
import * as uuid from "uuid";
import { Context } from "shared/backend/context";

import {
  FlashJob,
  FlashStage,
  FlashStages,
} from "shared/backend/graph/__generated__";

export const jobUpdates = new PubSub();

const jobs: Record<string, FlashJob> = {};

export const createJob = (
  stages: (keyof Omit<FlashStages, "__typename">)[]
): FlashJob => {
  const id = uuid.v1();
  const job: FlashJob = {
    id,
    cancelled: false,
    stages: Object.fromEntries(
      stages.map((stage) => [
        stage,
        {
          started: false,
          completed: false,
          progress: 0,
        },
      ])
    ) as unknown as FlashStages,
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
    async (updatedJob: FlashJob) => {
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

export const getJob = (jobId: string): FlashJob | undefined => jobs[jobId];

const isCancelled = (jobId: string): boolean => jobs[jobId]?.cancelled ?? true;

const debouncedPublish = debounce(jobUpdates.publish.bind(jobUpdates), 10);

export const updateJob = (jobId: string, updatedJob: FlashJob): void => {
  jobs[jobId] = updatedJob;
  void debouncedPublish(jobId, updatedJob);
};

export const updateStageStatus = (
  jobId: string,
  stage: keyof Omit<FlashStages, "__typename">,
  status: Partial<Omit<FlashStage, "__typename">>
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
    let stage: "erase" | "flash" = "erase";
    process.events.on("error", (err: Error) => {
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

    process.events.on("end", () => {
      updateStageStatus(jobId, "flash", {
        completed: true,
      });
      resolve();
    });
  });
};
