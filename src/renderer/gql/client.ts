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
  void link.initialiseBackend({
    mocked: config.startParams.isMocked,
    e2e: config.startParams.isE2e,
    githubToken: config.startParams.githubToken,
  });
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

const typePolicies: StrictTypedTypePolicies = {};

export default new ApolloClient({
  cache: new InMemoryCache({
    typePolicies,
  }),
  link,
});
