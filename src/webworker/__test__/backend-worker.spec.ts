import { ApolloClient, gql, InMemoryCache } from "@apollo/client/core";
import { createWebWorkerBusLink } from "apollo-bus-link";
import getOriginPrivateDirectory from "native-file-system-adapter/src/getOriginPrivateDirectory";
import nodeAdapter from "native-file-system-adapter/src/adapters/node";
import nock from "nock";
import { MockedFunction } from "vitest";
// eslint-disable-next-line import/extensions
import BackendWebWorker from "webworker/backend.worker.ts?worker";
import {
  showDirectoryPicker,
  requestDevice,
} from "webworker/crossboundary/functions";
import tmp from "tmp-promise";

const worker = new BackendWebWorker();

const link = createWebWorkerBusLink(worker);
showDirectoryPicker.listen(worker);
requestDevice.listen(worker);

const cache = new InMemoryCache();
const client = new ApolloClient({
  cache,
  link,
});

const showDirectoryPickerMock = vitest.fn() as MockedFunction<
  typeof window.showDirectoryPicker
>;
window.showDirectoryPicker = showDirectoryPickerMock;

const requestDeviceMock = vitest.fn() as MockedFunction<
  typeof navigator.usb.requestDevice
>;
const getDevicesMock = vitest.fn() as MockedFunction<
  typeof navigator.usb.getDevices
>;
navigator.usb.requestDevice = requestDeviceMock;
navigator.usb.getDevices = getDevicesMock;

beforeEach(() => cache.reset());

describe("Backend Workers", () => {
  it("should return queried data over the webworker message transport", async () => {
    const { nockDone } = await nock.back("sdcard-pack-releases.json");

    const { data, errors } = await client.query({
      query: gql(`
        query {
          edgeTxSdcardPackReleases {
            id
            name
          }
        }
      `),
    });

    expect(errors).toBeFalsy();
    expect(
      (data?.edgeTxSdcardPackReleases as unknown[]).length
    ).toBeGreaterThan(0);
    nockDone();
  });

  describe("showDirectoryPicker", () => {
    it("should be called via the crossboudary function when the pickSdcardDirectory mutation is fired", async () => {
      const folder = (await tmp.dir()).path;
      const handle = await getOriginPrivateDirectory(
        nodeAdapter,
        (
          await tmp.dir()
        ).path
      );

      // @ts-expect-error ignore this
      handle.name = folder;
      showDirectoryPickerMock.mockResolvedValue(handle);

      const { data, errors } = await client.mutate({
        mutation: gql(`
          mutation RequestFolder {
            pickSdcardDirectory {
              id
              name
            }
          }
        `),
      });

      expect(errors).toBeFalsy();
      expect(data?.pickSdcardDirectory).toMatchObject({
        id: expect.any(String),
        name: folder,
      });
    });

    it("should handle errors cross boundary", async () => {
      showDirectoryPickerMock.mockRejectedValue(new Error("Some bad error"));

      const { data, errors } = await client.mutate({
        mutation: gql(`
          mutation RequestFolder {
            pickSdcardDirectory {
              id
              name
            }
          }
        `),
      });

      expect(errors).toBeFalsy();
      expect(data?.pickSdcardDirectory).toBeNull();
    });
  });

  describe("requestDevice", () => {
    it("should be called via the crossboudary function when the requestFlashableDevice mutation is fired", async () => {
      const devices = [
        {
          productName: "Some product",
          serialNumber: "some-serial-number",
          vendorId: 123,
          productId: 567,
        } as USBDevice,
      ];
      requestDeviceMock.mockResolvedValueOnce(devices[0]!);
      getDevicesMock.mockResolvedValue(devices);

      const { data, errors } = await client.mutate({
        mutation: gql(`
          mutation RequestDevice {
            requestFlashableDevice {
              id
              productName
            }
          }
        `),
      });

      expect(errors).toBeFalsy();
      expect(data?.requestFlashableDevice).toMatchInlineSnapshot(`
        {
          "__typename": "FlashableDevice",
          "id": "some-serial-number",
          "productName": "Some product",
        }
      `);
    });

    it("should return null if the user doesnt select a device", async () => {
      requestDeviceMock.mockRejectedValueOnce(new Error("Some error"));

      const { data, errors } = await client.mutate({
        mutation: gql(`
          mutation RequestDevce {
            requestFlashableDevice {
              id
              name
            }
          }
        `),
      });

      expect(errors).toBeFalsy();
      expect(data?.requestFlashableDevice).toBeNull();
    });
  });
});
