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
  requestWritableFolder:
    createCrossBoundryWindowFunction("showDirectoryPicker").call,
};

const backend = createBusLinkBackend({
  registerBus: webWorkerBus(self),
  createExecutor: async () => {
    const executor = createSchemaExecutor({
      schema,
      context: createContext({
        fileSystem,
      }),
    });
    return executor;
  },
});

backend.listen();
