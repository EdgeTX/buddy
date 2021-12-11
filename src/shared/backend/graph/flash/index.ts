import gql from "graphql-tag";
import { GraphQLError } from "graphql";
import {
  FlashJob,
  FlashableDevice,
  Resolvers,
} from "shared/backend/graph/__generated__";
import config from "shared/config";
import { hexString } from "shared/tools";

const typeDefs = gql`
  type Mutation {
    createFlashJob(firmware: FlashFirmwareInput!, deviceId: ID!): FlashJob!
    cancelFlashJob(jobId: ID!): Boolean
    requestFlashableDevice: FlashableDevice
  }

  type Query {
    flashJobStatus(jobId: ID!): FlashJob
    flashableDevices: [FlashableDevice!]!
    flashableDevice(id: ID!): FlashableDevice
  }

  type Subscription {
    flashJobStatusUpdates(jobId: ID!): FlashJob!
  }

  type FlashableDevice {
    id: String!
    productName: String
    serialNumber: String
    vendorId: String!
    productId: String!
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

const usbDeviceId = (device: USBDevice): string =>
  device.serialNumber ??
  `${hexString(device.vendorId)}:${hexString(device.productId)}`;

const usbDeviceToFlashDevice = (device: USBDevice): FlashableDevice => ({
  id: usbDeviceId(device),
  productName: device.productName,
  serialNumber: device.serialNumber,
  vendorId: hexString(device.vendorId),
  productId: hexString(device.productId),
});

const findDevice = (devices: USBDevice[], id: string): USBDevice | undefined =>
  devices.find((d) => usbDeviceId(d) === id);

const resolvers: Resolvers = {
  Mutation: {
    createFlashJob: async (_, { firmware, deviceId }, context) => {
      let firmwareData: Buffer | undefined;
      let firmwareBundleUrl: string | undefined;
      if (firmware.version === "local") {
        const localFirmware = context.firmwareStore.getLocalFirmwareById(
          firmware.target
        );

        firmwareData = localFirmware?.data;

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

      const device = findDevice(await context.usb.deviceList(), deviceId);

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
    flashableDevice: async (_, { id }, { usb }) => {
      const device = findDevice(await usb.deviceList(), id);

      return device ? usbDeviceToFlashDevice(device) : null;
    },
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
