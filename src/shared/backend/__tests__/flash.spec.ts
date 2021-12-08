import { describe, expect, it, jest } from "@jest/globals";
import gql from "graphql-tag";
import { createExecutor } from "test-utils/backend";
import { MockedFunction } from "jest-mock";

const requestDeviceMock = jest.fn() as MockedFunction<
  typeof navigator.usb.requestDevice
>;
const listDevicesMock = jest.fn() as MockedFunction<
  typeof navigator.usb.getDevices
>;

const backend = createExecutor({
  usb: {
    requestDevice: requestDeviceMock,
    deviceList: listDevicesMock,
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
