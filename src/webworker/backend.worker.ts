// EXECUTES IN A WEB WORKER
/* eslint-disable no-restricted-globals */
import {
  createBusLinkBackend,
  createSchemaExecutor,
} from "apollo-bus-link/core";
import { webWorkerBus } from "apollo-bus-link/webworker";
import { createContext, FileSystemApi, schema, UsbApi } from "shared/backend";
import { showDirectoryPicker, requestDevice } from "./crossboundary/functions";

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

const backend = createBusLinkBackend({
  registerBus: webWorkerBus(self),
  executor: createSchemaExecutor({
    schema,
    context: createContext({
      fileSystem,
      usb,
    }),
  }),
});

backend.listen();
