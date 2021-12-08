import { ApolloClient, gql, InMemoryCache } from "@apollo/client/core";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createWebWorkerBusLink } from "apollo-bus-link";
import { MockedFunction } from "jest-mock";
import nock from "nock";
// eslint-disable-next-line import/extensions
import BackendWebWorker from "webworker/backend.worker.ts";
import {
  showDirectoryPicker,
  requestDevice,
} from "webworker/crossboundary/functions";

const worker = new BackendWebWorker();

const link = createWebWorkerBusLink(worker);
showDirectoryPicker.listen(worker);
requestDevice.listen(worker);

const cache = new InMemoryCache();
const client = new ApolloClient({
  cache,
  link,
});

const showDirectoryPickerMock = jest.fn() as MockedFunction<
  typeof window.showDirectoryPicker
>;
window.showDirectoryPicker = showDirectoryPickerMock;

const requestDeviceMock = jest.fn() as MockedFunction<
  typeof navigator.usb.requestDevice
>;
navigator.usb.requestDevice = requestDeviceMock;

beforeEach(() => cache.reset());

describe("Backend Workers", () => {
  it("should return queried data over the webworker message transport", async () => {
    const { nockDone } = await nock.back("sdcard-targets.json");

    const { data, errors } = await client.query({
      query: gql`
        query {
          sdcardTargets {
            id
            name
          }
        }
      `,
    });

    expect(errors).toBeFalsy();
    expect((data?.sdcardTargets as unknown[]).length).toBeGreaterThan(0);
    nockDone();
  });

  describe("showDirectoryPicker", () => {
    it("should be called via the crossboudary function when the pickSdcardFolder mutation is fired", async () => {
      showDirectoryPickerMock.mockResolvedValue({
        name: "/some/folder/path",
      } as FileSystemDirectoryHandle);

      const { data, errors } = await client.mutate({
        mutation: gql`
          mutation RequestFolder {
            pickSdcardFolder {
              id
              name
            }
          }
        `,
      });

      expect(errors).toBeFalsy();
      expect(data?.pickSdcardFolder).toEqual({
        id: expect.any(String),
        name: "/some/folder/path",
      });
    });

    it("should handle errors cross boundary", async () => {
      showDirectoryPickerMock.mockRejectedValue(new Error("Some bad error"));

      const { data, errors } = await client.mutate({
        mutation: gql`
          mutation RequestFolder {
            pickSdcardFolder {
              id
              name
            }
          }
        `,
      });

      expect(errors).toBeFalsy();
      expect(data?.pickSdcardFolder).toBeNull();
    });
  });
});
