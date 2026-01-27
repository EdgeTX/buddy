import debounce from "debounce";
import { dfuCommands, WebDFU } from "shared/dfu";
import { PubSub } from "graphql-subscriptions";
import * as uuid from "uuid";
import type { Context } from "shared/backend/context";
import type {
  FlashJobMetaType,
  FlashJobType,
  FlashStagesType,
  FlashStageType,
} from "shared/backend/graph/flash";
import { isUF2Payload, newUF2Reader } from "shared/uf2";

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

async function fetchFromCloudbuild(
  jobId: string,
  args: {
    device: USBDevice;
    firmware: {
      data?: Buffer;
      url?: string;
      target: string;
      version: string;
      selectedFlags?: { name: string; value: string }[];
    };
  },
  { cloudbuild }: Context
): Promise<Buffer | undefined> {
  updateStageStatus(jobId, "build", { started: true });

  const params = {
    release: args.firmware.version,
    target: args.firmware.target,
    flags: args.firmware.selectedFlags ?? [],
  };

  let status = await cloudbuild.createJob(params).catch((e: Error) => {
    updateStageStatus(jobId, "build", {
      error: e.message,
    });
    return undefined;
  });

  if (!status || isCancelled(jobId)) {
    return undefined;
  }

  // if the build is creating, wait
  if (status.status !== "BUILD_SUCCESS") {
    updateStageStatus(jobId, "build", {});
    status = await cloudbuild
      .waitForJobSuccess(params, (statusData) => {
        updateStageStatus(jobId, "build", {
          status: statusData,
          progress: 0,
        });
      })
      .catch((e: Error) => {
        updateStageStatus(jobId, "build", {
          error: e.message,
        });
        return undefined;
      });
    if (!status || isCancelled(jobId)) {
      return undefined;
    }
  }

  updateStageStatus(jobId, "build", {
    completed: true,
  });

  // success, download
  updateStageStatus(jobId, "download", {
    started: true,
  });

  if (!status.artifacts) {
    updateStageStatus(jobId, "download", {
      error: "missing artifact",
    });
    return undefined;
  }

  return cloudbuild
    .downloadBinary(status.artifacts[0].download_url)
    .catch((e: Error) => {
      updateStageStatus(jobId, "download", {
        error: e.message,
      });
      return undefined;
    });
}

export const rebootIntoDFU = async (
  jobId: string,
  dfuConnection: WebDFU,
  uf2Range: {
    startAddress: number;
    payload: Uint8Array;
    rebootAddress: number;
  },
  { usb, dfu }: Context
): Promise<WebDFU> => {
  const { startAddress, payload, rebootAddress } = uf2Range;
  const { vendorId, productId } = dfuConnection.device;

  await dfuConnection.rebootIntoDFU(startAddress, payload, rebootAddress);
  await dfuConnection.close().catch(() => {});
  updateStageStatus(jobId, "reboot", { started: true, progress: 10 });

  let progress = 0;
  const newDfuConnection = await dfu
    .reconnect(usb.deviceList, vendorId, productId, {
      onPoll: () => {
        progress += 5;
        updateStageStatus(jobId, "reboot", { started: true, progress });
      },
    })
    .catch((e: Error) => {
      updateStageStatus(jobId, "reboot", { error: e.message });
      throw e;
    });
  updateStageStatus(jobId, "reboot", {
    progress: 100,
    completed: true,
  });

  return newDfuConnection;
};

export const startExecution = async (
  jobId: string,
  args: {
    device: USBDevice;
    firmware: {
      data?: Buffer;
      url?: string;
      source: string;
      target: string;
      version: string;
      selectedFlags?: { name: string; value: string }[];
    };
  },
  context: Context
): Promise<void> => {
  const { dfu, firmwareStore } = context;
  const { device, firmware } = args;
  const isCloudBuild = firmware.source === "cloudbuild";

  let firmwareData = firmware.data;
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

    dfuProcess = await dfu.connect(device).catch((e: Error) => {
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

    if (isCloudBuild) {
      firmwareData = await fetchFromCloudbuild(jobId, args, context);
      if (!firmwareData || isCancelled(jobId)) {
        return;
      }
      updateStageStatus(jobId, "download", {
        completed: true,
        progress: 100,
      });
    } else if (!firmwareData) {
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

    if (isCancelled(jobId)) {
      return;
    }

    if (!isUF2Payload(firmwareData.buffer)) {
      await flash(jobId, dfuProcess, firmwareData);
    } else {
      const uf2Reader = newUF2Reader(firmwareData);
      const ranges = Array.from(uf2Reader.addressRanges());
      let isBootloader = true;

      // eslint-disable-next-line no-restricted-syntax
      for (const range of ranges) {
        if ("rebootAddress" in range) {
          // eslint-disable-next-line no-await-in-loop
          dfuProcess = await rebootIntoDFU(jobId, dfuProcess, range, context);
          isBootloader = false;
        } else {
          const { payload, startAddress } = range;
          // eslint-disable-next-line no-await-in-loop
          await flash(
            jobId,
            dfuProcess,
            Buffer.from(payload),
            startAddress,
            isBootloader
          );
        }
      }
    }
  })()
    .catch(async (e) => {
      console.error(e, await dfuProcess?.getStatus().catch(() => ({})));
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

  const currentStatus = job.stages[stage] ?? {
    started: false,
    progress: 0,
    completed: false,
  };

  const updatedJob = {
    ...job,
    stages: { ...job.stages, [stage]: { ...currentStatus, ...status } },
  };

  updateJob(jobId, updatedJob);
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
  firmware: ArrayBuffer,
  startAddress?: number | undefined,
  isBootloader?: boolean | undefined
): Promise<void> => {
  const options = startAddress ? { startAddress, reboot: false } : undefined;
  const process = connection.write(
    connection.properties?.TransferSize ?? 1024,
    firmware,
    options
  );

  const updateJobStatus = (
    stage: keyof FlashStagesType,
    status: Partial<FlashStageType>
  ): void => {
    const effectiveStage = (
      s: keyof FlashStagesType
    ): keyof FlashStagesType => {
      if (isBootloader) {
        if (s === "erase") {
          return "eraseBL";
        }
        if (s === "flash") {
          return "flashBL";
        }
      }
      return s;
    };
    updateStageStatus(jobId, effectiveStage(stage), status);
  };

  await new Promise<void>((resolve, reject) => {
    let stage: "erase" | "flash" | "finished" = "erase";
    process.events.on("error", async (err) => {
      // We've already assumed flashing is finished
      // so don't notify any errors
      if (stage === "finished") {
        return;
      }

      if (stage === "erase") {
        const { status } = await connection.getStatus();
        // Potentially this error indicates that the device is
        // write protected, so inform the user
        if (
          err.message.includes("command 65 failed") &&
          status === dfuCommands.STATUS_errVENDOR
        ) {
          updateJobStatus("erase", {
            error: "WRITE_PROTECTED",
          });
        } else {
          updateJobStatus("erase", {
            error: err.message,
          });
        }
      } else {
        updateJobStatus("flash", {
          error: err.message,
        });
      }
      reject(err);
    });

    process.events.on("erase/start", () => {
      updateJobStatus("erase", {
        started: true,
      });
    });
    process.events.on("erase/process", (progress, size) => {
      updateJobStatus("erase", {
        progress: (progress / size) * 100,
      });
    });
    process.events.on("erase/end", () => {
      updateJobStatus("erase", {
        progress: 100,
        completed: true,
      });
    });

    process.events.on("write/start", () => {
      stage = "flash";
      updateJobStatus("flash", {
        started: true,
      });
    });
    process.events.on("write/process", (progress, size) => {
      updateJobStatus("flash", {
        progress: (progress / size) * 100,
      });
    });

    let writeEndTimeout: NodeJS.Timeout;

    const finish = (): void => {
      stage = "finished";
      updateJobStatus("flash", {
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
