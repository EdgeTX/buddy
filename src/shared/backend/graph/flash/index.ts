import { GraphQLError } from "graphql";
import config from "shared/backend/config";
import { decodePrVersion, delay, hexString, isPrVersion } from "shared/tools";
import { TypeOf } from "shared/backend/types";
import { createBuilder } from "shared/backend/utils/builder";

const builder = createBuilder();

const FlashableDevice = builder.simpleObject("FlashableDevice", {
  fields: (t) => ({
    id: t.string(),
    productName: t.string({ nullable: true }),
    serialNumber: t.string({ nullable: true }),
    vendorId: t.string(),
    productId: t.string(),
  }),
});

const FlashStage = builder.simpleObject("FlashStage", {
  fields: (t) => ({
    progress: t.float(),
    started: t.boolean(),
    completed: t.boolean(),
    error: t.string({ nullable: true }),
  }),
});
export type FlashStageType = TypeOf<typeof FlashStage>;

const FlashJobMeta = builder.simpleObject("FlashJobMeta", {
  fields: (t_) => ({
    firmware: t_.field({
      type: builder.simpleObject("FlashFirmware", {
        fields: (t__) => ({
          version: t__.string(),
          target: t__.string(),
        }),
      }),
    }),
    deviceId: t_.id(),
  }),
});
export type FlashJobMetaType = TypeOf<typeof FlashJobMeta>;

const FlashStages = builder.simpleObject("FlashStages", {
  fields: (t_) => ({
    connect: t_.field({
      type: FlashStage,
    }),
    build: t_.field({
      type: FlashStage,
      nullable: true,
    }),
    download: t_.field({
      type: FlashStage,
      nullable: true,
    }),
    erase: t_.field({
      type: FlashStage,
    }),
    flash: t_.field({
      type: FlashStage,
    }),
  }),
});
export type FlashStagesType = TypeOf<typeof FlashStages>;

const FlashJob = builder.simpleObject("FlashJob", {
  fields: (t) => ({
    id: t.id(),
    cancelled: t.boolean(),
    meta: t.field({
      type: FlashJobMeta,
    }),
    stages: t.field({
      type: FlashStages,
    }),
  }),
});
export type FlashJobType = TypeOf<typeof FlashJob>;

const usbDeviceId = (device: USBDevice): string =>
  device.serialNumber ??
  `${hexString(device.vendorId)}:${hexString(device.productId)}`;

const usbDeviceToFlashDevice = (
  device: USBDevice
): TypeOf<typeof FlashableDevice> => ({
  id: usbDeviceId(device),
  productName: device.productName,
  serialNumber: device.serialNumber,
  vendorId: hexString(device.vendorId),
  productId: hexString(device.productId),
});

const findDevice = (devices: USBDevice[], id: string): USBDevice | undefined =>
  devices.find((d) => usbDeviceId(d) === id);

const waitForNotConnected = async (
  id: string,
  getDevices: () => Promise<USBDevice[]>
): Promise<void> => {
  // eslint-disable-next-line no-await-in-loop
  while (findDevice(await getDevices(), id)) {
    // eslint-disable-next-line no-await-in-loop
    await delay(500);
  }
};

const CloudSelectedFlags = builder.inputType("CloudSelectedFlag", {
  fields: (t__) => ({
    name: t__.string(),
    value: t__.string(),
  }),
});

builder.mutationType({
  fields: (t) => ({
    createFlashJob: t.field({
      type: FlashJob,
      args: {
        firmware: t.arg({
          type: builder.inputType("FlashFirmwareInput", {
            fields: (t__) => ({
              version: t__.string({ required: true }),
              target: t__.string({ required: true }),
              selectedFlags: t__.field({ type: [CloudSelectedFlags] }),
            }),
          }),
          required: true,
        }),
        deviceId: t.arg.id({ required: true }),
      },
      resolve: async (_, { firmware, deviceId }, context) => {
        let firmwareData: Buffer | undefined;
        let firmwareBundleUrl: string | undefined;
        let fetchCloudbuild = false;

        if (firmware.selectedFlags) {
          // check that all flags are set correctly
          if (
            firmware.selectedFlags.length > 0 &&
            !firmware.selectedFlags.every((flag) => flag.name && flag.value)
          ) {
            throw new GraphQLError("Specified flags are not valid");
          }
          // get firmware on cloudbuild
          fetchCloudbuild = true;
        } else if (firmware.version === "local") {
          // local firmware
          const localFirmware = context.firmwareStore.getLocalFirmwareById(
            firmware.target
          );

          firmwareData = localFirmware?.data;

          if (!firmwareData) {
            throw new GraphQLError("Specified firmware not found");
          }
        } else if (isPrVersion(firmware.version)) {
          const { commitId } = decodePrVersion(firmware.version);
          if (!commitId) {
            throw new GraphQLError("Commit not specified for PR");
          }
          const prBuild = await context.firmwareStore.fetchPrBuild(
            context.github,
            commitId
          );

          if (!prBuild) {
            throw new GraphQLError(
              "Could not find a build for given PR commit"
            );
          }

          firmwareBundleUrl = prBuild.url;
        } else {
          // github firmware
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

        const device = findDevice(
          await context.usb.deviceList(),
          deviceId.toString()
        );

        if (!device) {
          throw new GraphQLError("Device not found");
        }

        // If we already have the firmware we don't need to download
        // So start the state off assuming no download step
        let job;
        if (fetchCloudbuild) {
          job = context.flashJobs.createJob(
            ["connect", "build", "erase", "flash"],
            {
              firmware,
              deviceId,
            }
          );
        } else if (firmwareData) {
          job = context.flashJobs.createJob(["connect", "erase", "flash"], {
            firmware,
            deviceId,
          });
        } else {
          job = context.flashJobs.createJob(
            ["connect", "download", "erase", "flash"],
            {
              firmware,
              deviceId,
            }
          );
        }

        await context.flashJobs.startExecution(
          job.id.toString(),
          {
            device,
            firmware: {
              data: firmwareData,
              url: firmwareBundleUrl,
              target: firmware.target,
              version: firmware.version,
              selectedFlags: firmware.selectedFlags as
                | { name: string; value: string }[]
                | undefined,
            },
          },
          context
        );

        return job;
      },
    }),
    cancelFlashJob: t.boolean({
      nullable: true,
      args: {
        jobId: t.arg.id({ required: true }),
      },
      resolve: (_, { jobId }, { flashJobs }) => {
        const job = flashJobs.getJob(jobId.toString());
        if (!job) {
          throw new GraphQLError("Job doesnt exist");
        }

        if (job.cancelled) {
          throw new GraphQLError("Job already cancelled");
        }
        flashJobs.cancelJob(jobId.toString());

        return null;
      },
    }),
    requestFlashableDevice: t.field({
      type: FlashableDevice,
      nullable: true,
      resolve: async (_, __, { usb }) => {
        const device = await usb.requestDevice().catch(() => undefined);
        return device ? usbDeviceToFlashDevice(device) : null;
      },
    }),
    unprotectDevice: t.boolean({
      nullable: true,
      args: {
        deviceId: t.arg.id({ required: true }),
      },
      resolve: async (_, { deviceId }, context) => {
        const device = findDevice(
          await context.usb.deviceList(),
          deviceId.toString()
        );

        if (!device) {
          throw new GraphQLError("Device not found");
        }
        const connection = await context.dfu.connect(device);

        await connection.forceUnprotect().catch(async (error) => {
          throw new GraphQLError(
            `Could not clear write protection, ${
              (error as Error).message
            }, device status: ${JSON.stringify(await connection.getStatus())}`
          );
        });

        await Promise.race([
          waitForNotConnected(deviceId.toString(), context.usb.deviceList),
          delay(10000).then(() => {
            throw new Error("Timed out waiting for device to disconnect");
          }),
        ]);

        return null;
      },
    }),
  }),
});

builder.queryType({
  fields: (t) => ({
    flashJobStatus: t.field({
      type: FlashJob,
      nullable: true,
      args: {
        jobId: t.arg.id({ required: true }),
      },
      resolve: (_, { jobId }, { flashJobs }) =>
        flashJobs.getJob(jobId.toString()) ?? null,
    }),
    flashableDevices: t.field({
      type: [FlashableDevice],
      resolve: (_, __, { usb }) =>
        usb.deviceList().then((devices) => devices.map(usbDeviceToFlashDevice)),
    }),
    flashableDevice: t.field({
      type: FlashableDevice,
      nullable: true,
      args: {
        id: t.arg.id({ required: true }),
      },
      resolve: async (_, { id }, { usb }) => {
        const device = findDevice(await usb.deviceList(), id.toString());

        return device ? usbDeviceToFlashDevice(device) : null;
      },
    }),
  }),
});

builder.subscriptionType({
  fields: (t) => ({
    flashJobStatusUpdates: t.field({
      type: FlashJob,
      args: {
        jobId: t.arg.id({ required: true }),
      },
      subscribe: (_, { jobId }, { flashJobs }) => ({
        [Symbol.asyncIterator]() {
          return flashJobs.jobUpdates.asyncIterator<FlashJobType>(
            jobId.toString()
          );
        },
      }),
      resolve: (value: FlashJobType) => value,
    }),
  }),
});

export default {
  schema: builder.toSchema({}),
};
