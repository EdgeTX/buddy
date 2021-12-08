import gql from "graphql-tag";
import { GraphQLError } from "graphql";
import {
  FlashJob,
  FlashableDevice,
  Resolvers,
} from "shared/backend/graph/__generated__";
import config from "shared/config";

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
    `${device.vendorId.toString(16)}:${device.productId.toString(16)}`,
  name: device.productName,
});

const resolvers: Resolvers = {
  Mutation: {
    createFlashJob: async (_, { firmware, deviceId }, context) => {
      let firmwareData: Buffer | undefined;
      let firmwareBundleUrl: string | undefined;
      if (firmware.version === "local") {
        firmwareData = context.firmwareStore.getLocalFirmwareById(
          firmware.target
        );

        if (!firmwareData) {
          throw new GraphQLError("Specified firmware not found");
        }
      } else {
        firmwareBundleUrl = (
          await context.github(
            "GET /repos/{owner}/{repo}/releases/tags/{tag}",
            {
              owner: config.github.organization,
              repo: config.github.repos.firmware,
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

      const device = (await context.usb.deviceList()).find(
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
        ? context.flashJobs.createJob(["connect", "erase", "flash"])
        : context.flashJobs.createJob([
            "connect",
            "download",
            "erase",
            "flash",
          ]);

      await context.flashJobs.startExecution(
        job.id,
        {
          device,
          firmware: {
            data: firmwareData,
            url: firmwareBundleUrl,
            target: firmware.target,
          },
        },
        context
      );

      return job;
    },
    cancelFlashJob: (_, { jobId }, { flashJobs }) => {
      const job = flashJobs.getJob(jobId);
      if (!job) {
        throw new GraphQLError("Job doesnt exist");
      }

      if (job.cancelled) {
        throw new GraphQLError("Job already cancelled");
      }
      flashJobs.cancelJob(jobId);

      return null;
    },
    requestFlashableDevice: async (_, __, { usb }) => {
      const device = await usb.requestDevice().catch(() => undefined);
      return device ? usbDeviceToFlashDevice(device) : null;
    },
  },
  Query: {
    flashJobStatus: (_, { jobId }, { flashJobs }) =>
      flashJobs.getJob(jobId) ?? null,
    flashableDevices: (_, __, { usb }) =>
      usb.deviceList().then((devices) => devices.map(usbDeviceToFlashDevice)),
  },
  Subscription: {
    flashJobStatusUpdates: {
      subscribe: (_, { jobId }, { flashJobs }) => ({
        [Symbol.asyncIterator]() {
          return flashJobs.jobUpdates.asyncIterator<FlashJob>(jobId);
        },
      }),
      resolve: (value: FlashJob) => value,
    },
  },
};

export default {
  typeDefs,
  resolvers,
};
