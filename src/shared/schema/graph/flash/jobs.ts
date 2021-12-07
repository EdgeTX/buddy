import debounce from "debounce";
import { WebDFU } from "dfu";
import { PubSub } from "graphql-subscriptions";
import { Context } from "../../context";
import * as uuid from "uuid";

import { FlashJob, FlashStage, FlashStages } from "../__generated__";

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
) => {
  let firmwareData = args.firmware.data;
  let dfuProcess: WebDFU | undefined;
  let cancelled = false;

  const cancelledListener = await jobUpdates.subscribe(
    jobId,
    async (updatedJob: FlashJob) => {
      if (updatedJob.cancelled) {
        cancelled = true;
        if (dfuProcess) {
          console.log("Cancelling dfu process");
          await dfuProcess.close().catch(() => {});
          dfuProcess = undefined;
          await args.device.close().catch(() => {});
        }
        jobUpdates.unsubscribe(cancelledListener);
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

    updateStageStatus(jobId, "connect", {
      completed: true,
    });

    if (!dfuProcess || cancelled) {
      return;
    }

    if (!firmwareData) {
      updateStageStatus(jobId, "download", {
        started: true,
      });

      firmwareData = await firmwareStore
        .fetchFirmware(args.firmware.url!, args.firmware.target)
        .catch((e: Error) => {
          updateStageStatus(jobId, "download", {
            error: e.message,
          });
          return undefined;
        });

      if (!firmwareData || cancelled) {
        return;
      }
      updateStageStatus(jobId, "download", {
        completed: true,
        progress: 100,
      });
    }

    await flash(jobId, dfuProcess, firmwareData);
  })().catch((e) => {
    console.error(e);
    cancelJob(jobId);
  });
};

export const getJob = (jobId: string): FlashJob | undefined => jobs[jobId];

const debouncedPublish = debounce(jobUpdates.publish.bind(jobUpdates), 10);

export const updateJob = (jobId: string, updatedJob: FlashJob) => {
  jobs[jobId] = updatedJob;
  debouncedPublish(jobId, updatedJob);
};

export const updateStageStatus = (
  jobId: string,
  stage: keyof Omit<FlashStages, "__typename">,
  status: Partial<Omit<FlashStage, "__typename">>
) => {
  const job = getJob(jobId);
  if (!job) {
    return;
  }

  updateJob(jobId, {
    ...job,
    stages: { ...job.stages, [stage]: { ...job.stages[stage], ...status } },
  });
};

export const cancelJob = async (jobId: string) => {
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
    process.events.on("erase/process", (progress) => {
      updateStageStatus(jobId, "erase", {
        progress: (progress / firmware.byteLength) * 100,
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
    process.events.on("write/process", (progress) => {
      updateStageStatus(jobId, "flash", {
        progress: (progress / firmware.byteLength) * 100,
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
