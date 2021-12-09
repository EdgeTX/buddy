import { afterAll, describe, expect, it, jest } from "@jest/globals";
import gql from "graphql-tag";
import { createExecutor } from "test-utils/backend";
import { MockedFunction } from "jest-mock";
import { createDfuEvents, connect } from "shared/backend/mocks/dfu";
import nock from "nock";
import { waitForStageCompleted } from "test-utils/tools";
import { FlashJob } from "shared/backend/graph/__generated__";
import { WebDFU } from "dfu";
import md5 from "md5";

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
              name
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
              "name": "Some device name",
            },
            Object {
              "id": "012345",
              "name": "Some other device name",
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
              name
            }
          }
        `,
      });

      expect(errors).toBeFalsy();
      expect(data).toMatchInlineSnapshot(`
        Object {
          "flashableDevices": Array [
            Object {
              "id": "234:567",
              "name": "Some device name",
            },
            Object {
              "id": "abc:def",
              "name": "Some other device name",
            },
          ],
        }
      `);
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
              name
            }
          }
        `,
      });

      expect(errors).toBeFalsy();
      expect(data?.requestFlashableDevice).toMatchInlineSnapshot(`
        Object {
          "id": "some-serial-number",
          "name": "Some product",
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
              name
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

  describe("Create flash job", () => {
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
    let jobId: string;
    let jobUpdatesQueue: AsyncIterator<FlashJob, any, undefined>;

    afterAll(async () => {
      if (jobId) {
        await backend.mutate({
          mutation: gql`
            mutation CancelFlashJob($jobId: ID!) {
              cancelFlashJob(jobId: $jobId)
            }
          `,
          variables: {
            jobId,
          },
        });
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
        backend.context.flashJobs.jobUpdates.asyncIterator<FlashJob>(jobId);

      await waitForStageCompleted(jobUpdatesQueue, "connect");

      expect(await queryFlashStatus(jobId)).toMatchInlineSnapshot(`
        Object {
          "cancelled": false,
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
});
