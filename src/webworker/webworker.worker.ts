// EXECUTES IN A WEB WORKER
/* eslint-disable no-restricted-globals */
import {
  createBusLinkBackend,
  webWorkerBus,
  createSchemaExecutor,
} from "apollo-bus-link";
import { createContext, schema } from "../shared/schema";
import { createCrossBoundryWindowFunction } from "./crossBoundary";

const fileSystem = {
  requestWritableFolder: createCrossBoundryWindowFunction("showDirectoryPicker")
    .call,
};

const usb = {
  requestDevice: () => navigator.usb.requestDevice({ filters: [] }),
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
