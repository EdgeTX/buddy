import * as firmwareStore from "./services/firmwareStore";
import * as dfu from "./services/dfu";
import * as sdcardAssets from "./services/sdcardAssets";
import * as sdcardJobs from "./services/sdcardJobs";
import * as flashJobs from "./services/flashJobs";
import { github } from "./services/github";

import { FileSystemApi, UsbApi } from "./types";

export type Context = {
  github: typeof github;
  firmwareStore: typeof firmwareStore;
  dfu: typeof dfu;
  usb: UsbApi;
  fileSystem: FileSystemApi;
  sdcardAssets: typeof sdcardAssets;
  sdcardJobs: typeof sdcardJobs;
  flashJobs: typeof flashJobs;
};

export const createContext =
  (extras: { fileSystem: FileSystemApi; usb: UsbApi; dfu?: typeof dfu }) =>
  (): Context => ({
    github,
    firmwareStore,
    dfu,
    sdcardAssets,
    flashJobs,
    sdcardJobs,
    ...extras,
  });
