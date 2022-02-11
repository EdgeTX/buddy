import gql from "graphql-tag";
import { createExecutor } from "test-utils/backend";
import { MockedFunction } from "jest-mock";
import { createDfuEvents } from "shared/backend/mocks/dfu";
import nock from "nock";
import { waitForStageCompleted } from "test-utils/tools";
import { WebDFU } from "dfu";
import md5 from "md5";
import { connect } from "shared/backend/services/dfu";
import { FlashJobType } from "shared/backend/graph/flash";

const requestDeviceMock = jest.fn() as MockedFunction<
  typeof navigator.usb.requestDevice
>;
const listDevicesMock = jest.fn() as MockedFunction<
  typeof navigator.usb.getDevices
>;

const dfuConnectMock = jest.fn() as MockedFunction<typeof connect>;

const dfuWriteFunc = jest.fn() as MockedFunction<WebDFU["write"]>;

const backend = createExecutor({
  usb: {
    requestDevice: requestDeviceMock,
    deviceList: listDevicesMock,
  },
  dfu: {
    connect: dfuConnectMock,
  },
});

describe("Query", () => {
  describe("flashableDevices", () => {
    it("should return the list of available usb devices", async () => {
      listDevicesMock.mockResolvedValue([
        {
          productName: "Some device name",
          serialNumber: "012345",
        },
        {
          productName: "Some other device name",
          serialNumber: "012345",
        },
      ] as USBDevice[]);

      const { data, errors } = await backend.query({
        query: gql`
          query {
            flashableDevices {
              id
              productName
            }
          }
        `,
      });

      expect(errors).toBeFalsy();
      expect(data).toMatchInlineSnapshot(`
        Object {
          "flashableDevices": Array [
            Object {
              "id": "012345",
              "productName": "Some device name",
            },
            Object {
              "id": "012345",
              "productName": "Some other device name",
            },
          ],
        }
      `);
    });

    it("should use the product and vendor id if the serial number isn't available", async () => {
      listDevicesMock.mockResolvedValue([
        {
          productName: "Some device name",
          vendorId: 0x234,
          productId: 0x567,
        },
        {
          productName: "Some other device name",
          vendorId: 0xabc,
          productId: 0xdef,
        },
      ] as USBDevice[]);

      const { data, errors } = await backend.query({
        query: gql`
          query {
            flashableDevices {
              id
              productName
            }
          }
        `,
      });

      expect(errors).toBeFalsy();
      expect(data).toMatchInlineSnapshot(`
        Object {
          "flashableDevices": Array [
            Object {
              "id": "0x0234:0x0567",
              "productName": "Some device name",
            },
            Object {
              "id": "0x0ABC:0x0DEF",
              "productName": "Some other device name",
            },
          ],
        }
      `);
    });
  });

  describe("flashableDevice", () => {
    it("should return the details of the device", async () => {
      listDevicesMock.mockResolvedValue([
        {
          productName: "Some device name",
          serialNumber: "012345",
        },
        {
          productName: "Some other device name",
          serialNumber: "56789",
          vendorId: 0x3240,
          productId: 0x3243,
        },
      ] as USBDevice[]);

      const { data, errors } = await backend.query({
        query: gql`
          query FlashableDeviceQuery($id: ID!) {
            flashableDevice(id: $id) {
              id
              productName
              vendorId
              productId
              serialNumber
            }
          }
        `,
        variables: {
          id: "56789",
        },
      });

      expect(errors).toBeFalsy();
      expect(data?.flashableDevice).not.toBeNull();
      expect(data?.flashableDevice).toMatchInlineSnapshot(`
        Object {
          "id": "56789",
          "productId": "0x3243",
          "productName": "Some other device name",
          "serialNumber": "56789",
          "vendorId": "0x3240",
        }
      `);
    });

    it("should return the null if the device doesn't exist", async () => {
      listDevicesMock.mockResolvedValue([
        {
          productName: "Some device name",
          serialNumber: "012345",
        },
        {
          productName: "Some other device name",
          serialNumber: "56789",
        },
      ] as USBDevice[]);

      const { data, errors } = await backend.query({
        query: gql`
          query FlashableDeviceQuery($id: ID!) {
            flashableDevice(id: $id) {
              id
              productName
            }
          }
        `,
        variables: {
          id: "98765",
        },
      });

      expect(errors).toBeFalsy();
      expect(data?.flashableDevice).toBeNull();
    });
  });
});

describe("Mutation", () => {
  describe("requestFlashableDevice", () => {
    it("should return the details of the picked device", async () => {
      requestDeviceMock.mockResolvedValueOnce({
        productName: "Some product",
        serialNumber: "some-serial-number",
      } as USBDevice);

      const { data, errors } = await backend.mutate({
        mutation: gql`
          mutation RequestDevce {
            requestFlashableDevice {
              id
              productName
            }
          }
        `,
      });

      expect(errors).toBeFalsy();
      expect(data?.requestFlashableDevice).toMatchInlineSnapshot(`
        Object {
          "id": "some-serial-number",
          "productName": "Some product",
        }
      `);
    });

    it("should return null if the user doesnt select a device", async () => {
      requestDeviceMock.mockRejectedValueOnce(new Error("Some error"));

      const { data, errors } = await backend.mutate({
        mutation: gql`
          mutation RequestDevce {
            requestFlashableDevice {
              id
              productName
            }
          }
        `,
      });

      expect(errors).toBeFalsy();
      expect(data?.requestFlashableDevice).toBeNull();
    });
  });

  const queryFlashStatus = async (jobId: string) => {
    const { data } = await backend.query({
      query: gql`
        query FlashJobStatus($jobId: ID!) {
          flashJobStatus(jobId: $jobId) {
            cancelled
            meta {
              firmware {
                target
                version
              }
              deviceId
            }
            stages {
              connect {
                ...FlashJobStageData
              }
              build {
                ...FlashJobStageData
              }
              download {
                ...FlashJobStageData
              }
              erase {
                ...FlashJobStageData
              }
              flash {
                ...FlashJobStageData
              }
            }
          }
        }

        fragment FlashJobStageData on FlashStage {
          started
          completed
          progress
          error
        }
      `,
      variables: {
        jobId,
      },
    });

    return data?.flashJobStatus;
  };

  const cancelFlashJob = (jobId: string) =>
    backend.mutate({
      mutation: gql`
        mutation CancelFlashJob($jobId: ID!) {
          cancelFlashJob(jobId: $jobId)
        }
      `,
      variables: {
        jobId,
      },
    });

  const dfuEvents = createDfuEvents();
  const mockDevice = {
    productName: "Some device",
    serialNumber: "some-device-id",
    close: jest.fn().mockRejectedValue(undefined),
  };
  const mockDfuConnection = {
    write: dfuWriteFunc.mockReturnValue({
      events: dfuEvents,
    }),
    close: jest.fn().mockRejectedValue(undefined),
    properties: {
      TransferSize: 4567,
    },
  };

  describe("Create flash job from release", () => {
    let jobId: string;
    let jobUpdatesQueue: AsyncIterator<FlashJobType, any, undefined>;

    afterAll(async () => {
      if (jobId) {
        await cancelFlashJob(jobId);
      }
    });

    it("should download the given firmware target and start flashing it, updating the job status", async () => {
      dfuConnectMock.mockResolvedValue(mockDfuConnection as never);
      listDevicesMock.mockResolvedValue([mockDevice as never]);

      const { nockDone } = await nock.back("flash-job-nv-14-2.5.0.json", {
        recorder: { enable_reqheaders_recording: true },
      });

      const createFlashMutation = await backend.mutate({
        mutation: gql`
          mutation CreateFlashJob {
            createFlashJob(
              firmware: { target: "nv14", version: "v2.5.0" }
              deviceId: "some-device-id"
            ) {
              id
            }
          }
        `,
      });

      expect(createFlashMutation.errors).toBeFalsy();
      ({ id: jobId } = createFlashMutation.data?.createFlashJob as {
        id: string;
      });
      expect(jobId).toBeTruthy();

      jobUpdatesQueue =
        backend.context.flashJobs.jobUpdates.asyncIterator<FlashJobType>(jobId);

      await waitForStageCompleted(jobUpdatesQueue, "connect");

      expect(await queryFlashStatus(jobId)).toMatchInlineSnapshot(`
        Object {
          "cancelled": false,
          "meta": Object {
            "deviceId": "some-device-id",
            "firmware": Object {
              "target": "nv14",
              "version": "v2.5.0",
            },
          },
          "stages": Object {
            "build": null,
            "connect": Object {
              "completed": true,
              "error": null,
              "progress": 0,
              "started": true,
            },
            "download": Object {
              "completed": false,
              "error": null,
              "progress": 0,
              "started": true,
            },
            "erase": Object {
              "completed": false,
              "error": null,
              "progress": 0,
              "started": false,
            },
            "flash": Object {
              "completed": false,
              "error": null,
              "progress": 0,
              "started": false,
            },
          },
        }
      `);

      await waitForStageCompleted(jobUpdatesQueue, "download");
      nockDone();

      expect(mockDfuConnection.write).toHaveBeenCalledWith(
        mockDfuConnection.properties.TransferSize,
        expect.any(Buffer),
        true
      );

      const bufferToWrite = mockDfuConnection.write.mock.calls[0]![1];
      expect(md5(Buffer.from(bufferToWrite))).toMatchInlineSnapshot(
        `"aeeec48fe8d3aa51a5f6b602916d42ce"`
      );

      expect(await queryFlashStatus(jobId)).toMatchInlineSnapshot(`
        Object {
          "cancelled": false,
          "meta": Object {
            "deviceId": "some-device-id",
            "firmware": Object {
              "target": "nv14",
              "version": "v2.5.0",
            },
          },
          "stages": Object {
            "build": null,
            "connect": Object {
              "completed": true,
              "error": null,
              "progress": 0,
              "started": true,
            },
            "download": Object {
              "completed": true,
              "error": null,
              "progress": 100,
              "started": true,
            },
            "erase": Object {
              "completed": false,
              "error": null,
              "progress": 0,
              "started": false,
            },
            "flash": Object {
              "completed": false,
              "error": null,
              "progress": 0,
              "started": false,
            },
          },
        }
      `);
    });

    it("should update the erase status when erasing starts", async () => {
      dfuEvents.emit("erase/start");
      expect(await queryFlashStatus(jobId)).toMatchInlineSnapshot(`
        Object {
          "cancelled": false,
          "meta": Object {
            "deviceId": "some-device-id",
            "firmware": Object {
              "target": "nv14",
              "version": "v2.5.0",
            },
          },
          "stages": Object {
            "build": null,
            "connect": Object {
              "completed": true,
              "error": null,
              "progress": 0,
              "started": true,
            },
            "download": Object {
              "completed": true,
              "error": null,
              "progress": 100,
              "started": true,
            },
            "erase": Object {
              "completed": false,
              "error": null,
              "progress": 0,
              "started": true,
            },
            "flash": Object {
              "completed": false,
              "error": null,
              "progress": 0,
              "started": false,
            },
          },
        }
      `);

      dfuEvents.emit("erase/process", 50, 100);
      expect(await queryFlashStatus(jobId)).toMatchInlineSnapshot(`
        Object {
          "cancelled": false,
          "meta": Object {
            "deviceId": "some-device-id",
            "firmware": Object {
              "target": "nv14",
              "version": "v2.5.0",
            },
          },
          "stages": Object {
            "build": null,
            "connect": Object {
              "completed": true,
              "error": null,
              "progress": 0,
              "started": true,
            },
            "download": Object {
              "completed": true,
              "error": null,
              "progress": 100,
              "started": true,
            },
            "erase": Object {
              "completed": false,
              "error": null,
              "progress": 50,
              "started": true,
            },
            "flash": Object {
              "completed": false,
              "error": null,
              "progress": 0,
              "started": false,
            },
          },
        }
      `);

      dfuEvents.emit("erase/end");
      await waitForStageCompleted(jobUpdatesQueue, "erase");

      expect(await queryFlashStatus(jobId)).toMatchInlineSnapshot(`
        Object {
          "cancelled": false,
          "meta": Object {
            "deviceId": "some-device-id",
            "firmware": Object {
              "target": "nv14",
              "version": "v2.5.0",
            },
          },
          "stages": Object {
            "build": null,
            "connect": Object {
              "completed": true,
              "error": null,
              "progress": 0,
              "started": true,
            },
            "download": Object {
              "completed": true,
              "error": null,
              "progress": 100,
              "started": true,
            },
            "erase": Object {
              "completed": true,
              "error": null,
              "progress": 100,
              "started": true,
            },
            "flash": Object {
              "completed": false,
              "error": null,
              "progress": 0,
              "started": false,
            },
          },
        }
      `);
    });

    it("should update the flash status when flashing starts, and close the connection once finished", async () => {
      dfuEvents.emit("write/start");
      expect(await queryFlashStatus(jobId)).toMatchInlineSnapshot(`
        Object {
          "cancelled": false,
          "meta": Object {
            "deviceId": "some-device-id",
            "firmware": Object {
              "target": "nv14",
              "version": "v2.5.0",
            },
          },
          "stages": Object {
            "build": null,
            "connect": Object {
              "completed": true,
              "error": null,
              "progress": 0,
              "started": true,
            },
            "download": Object {
              "completed": true,
              "error": null,
              "progress": 100,
              "started": true,
            },
            "erase": Object {
              "completed": true,
              "error": null,
              "progress": 100,
              "started": true,
            },
            "flash": Object {
              "completed": false,
              "error": null,
              "progress": 0,
              "started": true,
            },
          },
        }
      `);

      dfuEvents.emit("write/process", 50, 100);
      expect(await queryFlashStatus(jobId)).toMatchInlineSnapshot(`
        Object {
          "cancelled": false,
          "meta": Object {
            "deviceId": "some-device-id",
            "firmware": Object {
              "target": "nv14",
              "version": "v2.5.0",
            },
          },
          "stages": Object {
            "build": null,
            "connect": Object {
              "completed": true,
              "error": null,
              "progress": 0,
              "started": true,
            },
            "download": Object {
              "completed": true,
              "error": null,
              "progress": 100,
              "started": true,
            },
            "erase": Object {
              "completed": true,
              "error": null,
              "progress": 100,
              "started": true,
            },
            "flash": Object {
              "completed": false,
              "error": null,
              "progress": 50,
              "started": true,
            },
          },
        }
      `);

      dfuEvents.emit("write/end", 100);
      dfuEvents.emit("end");
      await waitForStageCompleted(jobUpdatesQueue, "flash");

      expect(await queryFlashStatus(jobId)).toMatchInlineSnapshot(`
        Object {
          "cancelled": false,
          "meta": Object {
            "deviceId": "some-device-id",
            "firmware": Object {
              "target": "nv14",
              "version": "v2.5.0",
            },
          },
          "stages": Object {
            "build": null,
            "connect": Object {
              "completed": true,
              "error": null,
              "progress": 0,
              "started": true,
            },
            "download": Object {
              "completed": true,
              "error": null,
              "progress": 100,
              "started": true,
            },
            "erase": Object {
              "completed": true,
              "error": null,
              "progress": 100,
              "started": true,
            },
            "flash": Object {
              "completed": true,
              "error": null,
              "progress": 50,
              "started": true,
            },
          },
        }
      `);

      expect(mockDfuConnection.close).toHaveBeenCalled();
      expect(mockDevice.close).toHaveBeenCalled();
    });
  });

  describe("Create flash job from PR build", () => {
    let jobId: string;
    let jobUpdatesQueue: AsyncIterator<FlashJobType, any, undefined>;

    afterAll(async () => {
      if (jobId) {
        await cancelFlashJob(jobId);
      }
    });

    it("should download the given PR build and start flashing it, updating the job status", async () => {
      dfuConnectMock.mockResolvedValue(mockDfuConnection as never);
      listDevicesMock.mockResolvedValue([mockDevice as never]);

      const { nockDone } = await nock.back(
        "edgetx-single-pr-single-commit-firmware-bundle-target.json"
      );

      const createFlashMutation = await backend.mutate({
        mutation: gql`
          mutation CreateFlashJob {
            createFlashJob(
              firmware: {
                target: "nv14"
                version: "pr-1337@217c02e6e06b4500edbb0eca99b5d1d077111aab"
              }
              deviceId: "some-device-id"
            ) {
              id
            }
          }
        `,
      });

      expect(createFlashMutation.errors).toBeFalsy();
      ({ id: jobId } = createFlashMutation.data?.createFlashJob as {
        id: string;
      });
      expect(jobId).toBeTruthy();

      jobUpdatesQueue =
        backend.context.flashJobs.jobUpdates.asyncIterator<FlashJobType>(jobId);

      await waitForStageCompleted(jobUpdatesQueue, "connect");
      await waitForStageCompleted(jobUpdatesQueue, "download");
      nockDone();

      expect(mockDfuConnection.write).toHaveBeenCalledWith(
        mockDfuConnection.properties.TransferSize,
        expect.any(Buffer),
        true
      );

      const bufferToWrite = mockDfuConnection.write.mock.calls[0]![1];
      expect(md5(Buffer.from(bufferToWrite))).toMatchInlineSnapshot(
        `"0f52f2fa9f93e1fe7561ed7aaaf94d82"`
      );
    });
  });

  describe("Create flash job from local file", () => {
    let jobId: string;
    let jobUpdatesQueue: AsyncIterator<FlashJobType, any, undefined>;

    afterAll(async () => {
      if (jobId) {
        await cancelFlashJob(jobId);
      }
    });

    it("should flash the device with the given local file, and update the job status", async () => {
      dfuConnectMock.mockResolvedValue(mockDfuConnection as never);
      listDevicesMock.mockResolvedValue([mockDevice as never]);

      const fileData = Buffer.from("ABCDEFG");

      const firmwareId =
        backend.context.firmwareStore.registerFirmware(fileData);

      const createFlashMutation = await backend.mutate({
        mutation: gql`
          mutation CreateFlashJob($target: ID!) {
            createFlashJob(
              firmware: { target: $target, version: "local" }
              deviceId: "some-device-id"
            ) {
              id
              stages {
                download {
                  started
                  completed
                }
              }
            }
          }
        `,
        variables: {
          target: firmwareId,
        },
      });

      expect(createFlashMutation.errors).toBeFalsy();
      const job = createFlashMutation.data?.createFlashJob as {
        id: string;
        stages: any;
      };
      ({ id: jobId } = job);
      expect(jobId).toBeTruthy();
      expect(job.stages.download).toBeNull();

      jobUpdatesQueue =
        backend.context.flashJobs.jobUpdates.asyncIterator<FlashJobType>(jobId);

      await waitForStageCompleted(jobUpdatesQueue, "connect");

      expect(mockDfuConnection.write).toHaveBeenCalledWith(
        mockDfuConnection.properties.TransferSize,
        expect.any(Buffer),
        true
      );

      const bufferToWrite = mockDfuConnection.write.mock.calls[0]![1];
      expect(bufferToWrite).toEqual(fileData);
    });
  });
});
