import octokit from "@octokit/request";
import * as firmwareStore from "./services/firmwareStore";

export type Context = {
  github: typeof octokit.request;
  firmwareStore: typeof firmwareStore;
};

export const context = (): Context => ({
  github: octokit.request,
  firmwareStore,
});
