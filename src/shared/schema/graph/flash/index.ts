import gql from "gql-tag";
import { FlashableDevice, FlashJob, Resolvers } from "../__generated__";
import { GraphQLError } from "graphql";
import {
  cancelJob,
  createJob,
  startExecution,
  getJob,
  jobUpdates,
} from "./jobs";

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
        ? createJob(["connect", "erase", "flash"])
        : createJob(["connect", "download", "erase", "flash"]);

      await startExecution(
        job.id,
        device,
        { data: firmwareData, url: firmwareBundleUrl, target: firmware.target },
        context
      );

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

export default {
  typeDefs,
  resolvers,
};
