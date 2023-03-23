// EXECUTES IN A WEB WORKER
/* eslint-disable no-restricted-globals */
import {
  createBusLinkBackend,
  createSchemaExecutor,
} from "apollo-bus-link/core";
import { webWorkerBus } from "apollo-bus-link/webworker";
import { createContext, FileSystemApi, schema, UsbApi } from "shared/backend";
import { createGithubClient } from "shared/api/github";
import { showDirectoryPicker, requestDevice } from "./crossboundary/functions";
import { WorkerArgs } from "./types";

const fileSystem: FileSystemApi = {
  requestWritableDirectory: (options) =>
    showDirectoryPicker.call(self, options),
};

const usb: UsbApi = {
  requestDevice: async () => {
    const pickedDevice = await requestDevice.call(self, {
      filters: [],
    });
    const devicesWithPermission = await navigator.usb.getDevices();
    const device = devicesWithPermission.find(
      ({ vendorId, productId }) =>
        vendorId === pickedDevice.vendorId &&
        productId === pickedDevice.productId
    );

    if (!device) {
      throw new Error("Couldn't retrieve device on webworker side");
    }

    return device;
  },
  deviceList: () => navigator.usb.getDevices(),
};

const backend = createBusLinkBackend<WorkerArgs>({
  registerBus: webWorkerBus(self),
  createExecutor: async (args) =>
    createSchemaExecutor({
      schema,
      context: args.mocked
        ? (await import("shared/backend/mocks/context")).createMockContext(
            {
              fileSystem,
              github: createGithubClient(args.githubToken),
            },
            { faster: args.e2e }
          )
        : createContext({
            fileSystem,
            usb,
            github: createGithubClient(args.githubToken),
          }),
    }),
});

// First initialise with these params, they can be updated again by
// the worker directly. See `renderer/gql/client
void backend.initialise({ mocked: false, e2e: false });
backend.listen();
