import { WebDFU } from "dfu";
import * as uuid from "uuid";

import gql from "gql-tag";
import { PubSub } from "graphql-subscriptions";
import {
  FlashableDevice,
  FlashJob,
  FlashStage,
  FlashStages,
  Resolvers,
} from "../__generated__";
import { Context } from "../../context";
import { GraphQLError } from "graphql";
import debounce from "debounce";

const typeDefs = gql`
  type Mutation {
    createFlashJob(firmware: FlashFirmwareInput!, deviceId: ID!): FlashJob!
    cancelFlashJob(jobId: ID!): Boolean
    requestFlashableDevice: FlashableDevice
  }

  type Query {
    flashJobStatus(jobId: ID!): FlashJob
    flashableDevices: [FlashableDevice!]!
  }

  type Subscription {
    flashJobStatusUpdates(jobId: ID!): FlashJob!
  }

  type FlashableDevice {
    id: String!
    name: String
  }

  type FlashJob {
    id: ID!
    cancelled: Boolean!
    stages: FlashStages!
  }

  type FlashStages {
    connect: FlashStage!
    build: FlashStage
    download: FlashStage
    erase: FlashStage!
    flash: FlashStage!
  }

  type FlashStage {
    progress: Float!
    started: Boolean!
    completed: Boolean!
    error: String
  }

  input FlashFirmwareInput {
    version: ID!
    target: ID!
  }
`;

const usbDeviceToFlashDevice = (device: USBDevice): FlashableDevice => ({
  id:
    device.serialNumber ??
    `${device.vendorId.toString()}:${device.productId.toString()}`,
  name: device.productName,
});

const resolvers: Resolvers = {
  Mutation: {
    createFlashJob: async (_, { firmware, deviceId }, { usb, firmwareStore, github }) => {
      let firmwareData: Buffer | undefined;
      let firmwareBundleUrl: string | undefined;
      if (firmware.version === "local") {
        firmwareData = firmwareStore.getLocalFirmwareById(
          firmware.target
        );

        if (!firmwareData) {
          throw new GraphQLError("Specified firmware not found");
        }
      } else {
        firmwareBundleUrl = (
          await github(
            "GET /repos/{owner}/{repo}/releases/tags/{tag}",
            {
              owner: "EdgeTX",
              repo: "edgetx",
              tag: firmware.version,
            }
          )
        ).data.assets.find((asset) =>
          asset.name.includes("firmware")
        )?.browser_download_url;

        if (!firmwareBundleUrl) {
          throw new GraphQLError("Could not find specified firmware");
        }
      }

      const device = (await usb.deviceList()).find(
        ({ vendorId, productId, serialNumber }) =>
          deviceId.includes(":")
            ? `${vendorId}:${productId}` === deviceId
            : deviceId === serialNumber
      );

      if (!device) {
        throw new GraphQLError("Device not found");
      }

      // If we already have the firmware we don't need to download
      // So start the state off assuming no download step
      const job = firmwareData
        ? createJob(["connect", "erase", "flash"])
        : createJob(["connect", "download", "erase", "flash"]);

      let dfu: WebDFU | undefined;
      let cancelled = false;

      const cancelledListener = await jobUpdates.subscribe(
        job.id,
        async (updatedJob: FlashJob) => {
          if (updatedJob.cancelled) {
            cancelled = true;
            if (dfu) {
              await dfu.close();
            }
            jobUpdates.unsubscribe(cancelledListener);
          }
        }
      );

      // Run job
      (async () => {
        updateStageStatus(job.id, "connect", {
          started: true,
        });

        dfu = await usb.dfuConnect(device).catch((e: Error) => {
          updateStageStatus(job.id, "connect", {
            error: e.message,
          });
          return undefined;
        });

        updateStageStatus(job.id, "connect", {
          completed: true,
        });

        if (!dfu || cancelled) {
          return;
        }

        if (!firmwareData) {
          updateStageStatus(job.id, "download", {
            started: true,
          });

          firmwareData = await firmwareStore
            .fetchFirmware(firmwareBundleUrl!, firmware.target)
            .catch((e: Error) => {
              updateStageStatus(job.id, "download", {
                error: e.message,
              });
              return undefined;
            });

          if (!firmwareData || cancelled) {
            return;
          }
          updateStageStatus(job.id, "download", {
            completed: true,
          });
        }

        await flash(job.id, dfu, firmwareData);
      })().catch((e) => {
        console.error(e);
        cancelJob(job.id);
      });

      return job;
    },
    cancelFlashJob: async (_, { jobId }) => {
      const job = getJob(jobId);
      if (!job) {
        throw new GraphQLError("Job doesnt exist");
      }

      if (job.cancelled) {
        throw new GraphQLError("Job already cancelled");
      }
      await cancelJob(jobId);

      return null;
    },
    requestFlashableDevice: async (_, __, { usb }) => {
      const device = await usb.requestDevice();
      return device ? usbDeviceToFlashDevice(device) : null;
    },
  },
  Query: {
    flashJobStatus: (_, { jobId }) => getJob(jobId) ?? null,
    flashableDevices: (_, __, { usb }) =>
      usb.deviceList().then((devices) => devices.map(usbDeviceToFlashDevice)),
  },
  Subscription: {
    flashJobStatusUpdates: {
      subscribe: (_, { jobId }) => ({
        [Symbol.asyncIterator]() {
          return jobUpdates.asyncIterator<FlashJob>(jobId);
        },
      }),
      resolve: (value: FlashJob) => value,
    },
  },
};

/**
 * TODO: Move all this to a context service
 */
const jobUpdates = new PubSub();

const jobs: Record<string, FlashJob> = {};

const createJob = (
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

const getJob = (jobId: string): FlashJob | undefined => jobs[jobId];

const debouncedPublish = debounce(jobUpdates.publish.bind(jobUpdates), 10);

const updateJob = (jobId: string, updatedJob: FlashJob) => {
  jobs[jobId] = updatedJob;
  debouncedPublish(jobId, updatedJob);
};

const updateStageStatus = (
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

const cancelJob = async (jobId: string) => {
  const job = getJob(jobId);
  if (!job) {
    return;
  }

  updateJob(jobId, { ...job, cancelled: true });
};

const flash = async (
  jobId: string,
  connection: WebDFU,
  firmware: Buffer
): Promise<boolean> => {
  try {
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

    return true;
  } catch (error) {
    return false;
  }
};

export default {
  typeDefs,
  resolvers,
};
