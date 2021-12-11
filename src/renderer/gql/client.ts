import { ApolloClient, ApolloLink, InMemoryCache } from "@apollo/client";
import { createWebWorkerBusLink } from "apollo-bus-link/webworker";
import { createElectronBusLink } from "apollo-bus-link/electron";
import config from "shared/config";
import { StrictTypedTypePolicies } from "./__generated__/apollo-helpers";

const link = ApolloLink.from([
  // Only need the logger link in development mode
  ...(!config.isProduction
    ? [
        await import("apollo-link-logger").then(
          ({ default: apolloLogger }) => apolloLogger
        ),
      ]
    : []),
  window.ipcRenderer
    ? createElectronBusLink(window.ipcRenderer)
    : createWebWorkerBusLink(
        await import("webworker/backend.bootstrap").then(
          ({ default: Worker }) => Worker
        )
      ),
]);

const typePolicies: StrictTypedTypePolicies = {
  EdgeTxFirmwareBundle: {
    fields: {
      target: {
        read: (_, { args, toReference }) =>
          toReference({
            __typename: "EdgeTxFirmwareTarget",
            // We know this has to be given
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            id: args!.id as string,
          }),
      },
    },
  },
};

export default new ApolloClient({
  cache: new InMemoryCache({
    typePolicies,
  }),
  link,
});
