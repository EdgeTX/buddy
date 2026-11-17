import { createGithubClient, GithubClient } from "shared/api/github";
import * as firmwareStore from "./services/firmwareStore";
import * as backupStore from "./services/backupStore";
import * as dfu from "./services/dfu";
import * as sdcardAssets from "./services/sdcardAssets";
import * as sdcardJobs from "./services/sdcardJobs";
import * as flashJobs from "./services/flashJobs";
import * as cloudbuild from "./services/cloudbuild";

import { FileSystemApi, UsbApi } from "./types";

export type Context = {
  github: GithubClient;
  firmwareStore: typeof firmwareStore;
  backupStore: typeof backupStore;
  dfu: typeof dfu;
  usb: UsbApi;
  fileSystem: FileSystemApi;
  sdcardAssets: typeof sdcardAssets;
  sdcardJobs: typeof sdcardJobs;
  flashJobs: typeof flashJobs;
  cloudbuild: typeof cloudbuild;
};

export const createContext =
  (extras: {
    fileSystem: FileSystemApi;
    usb: UsbApi;
    github?: GithubClient;
    dfu?: typeof dfu;
  }) =>
  (): Context => ({
    github: extras.github ?? createGithubClient(),
    firmwareStore,
    backupStore,
    dfu,
    sdcardAssets,
    flashJobs,
    sdcardJobs,
    cloudbuild,
    ...extras,
  });
