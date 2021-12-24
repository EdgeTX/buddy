import { ApolloClient, ApolloLink, InMemoryCache } from "@apollo/client";
import { createWebWorkerBusLink } from "apollo-bus-link/webworker";
import { createElectronBusLink } from "apollo-bus-link/electron";
import config from "shared/config";
import { WorkerArgs } from "webworker/types";
import { StrictTypedTypePolicies } from "./__generated__/apollo-helpers";

const createBusLink = async (): Promise<ApolloLink> => {
  if (window.ipcRenderer) {
    return createElectronBusLink(window.ipcRenderer);
  }

  const { default: Worker } = await import("webworker/backend.bootstrap");

  const link = createWebWorkerBusLink<WorkerArgs>(Worker);
  void link.initialiseBackend({ mocked: config.isMocked });
  return link;
};

const link = ApolloLink.from([
  // Only need the logger link in development mode
  ...(!config.isProduction
    ? [
        await import("apollo-link-logger").then(
          ({ default: apolloLogger }) => apolloLogger
        ),
      ]
    : []),
  await createBusLink(),
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
