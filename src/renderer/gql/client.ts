import { ApolloClient, InMemoryCache, ApolloLink } from "@apollo/client";
import apolloLogger from "apollo-link-logger";
import { createWebWorkerBusLink } from "apollo-bus-link/webworker";
import { createElectronBusLink } from "apollo-bus-link/electron";
import worker from "../../webworker/webworker.bootstrap";

const link = ApolloLink.from([
  apolloLogger,
  window.ipcRenderer
    ? createElectronBusLink(window.ipcRenderer)
    : createWebWorkerBusLink(worker),
]);

export default new ApolloClient({
  cache: new InMemoryCache(),
  link,
});
