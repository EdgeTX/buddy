import { Octokit } from "@octokit/core";
import ky from "ky-universal";
import config from "shared/config";
import * as firmwareStore from "./services/firmwareStore";
import * as dfu from "./services/dfu";
import * as sdcardAssets from "./services/sdcardAssets";
import * as sdcardJobs from "./services/sdcardJobs";
import * as flashJobs from "./services/flashJobs";

import { FileSystemApi, UsbApi } from "./types";
import { mockDeviceList } from "./mocks/devices";
import * as mockDfu from "./mocks/dfu";

export type Context = {
  github: Octokit["request"];
  firmwareStore: typeof firmwareStore;
  dfu: typeof dfu;
  usb: UsbApi;
  fileSystem: FileSystemApi;
  sdcardAssets: typeof sdcardAssets;
  sdcardJobs: typeof sdcardJobs;
  flashJobs: typeof flashJobs;
};

const octokit = new Octokit({
  auth: config.github.apiKey,
  request: {
    fetch: ky,
  },
});

export const createContext =
  (extras: { fileSystem: FileSystemApi; usb: UsbApi; dfu?: typeof dfu }) =>
  (): Context => ({
    github: octokit.request,
    firmwareStore,
    dfu,
    sdcardAssets,
    flashJobs,
    sdcardJobs,
    ...extras,
  });

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const createMockContext = (extras: { fileSystem: FileSystemApi }) =>
  createContext({
    usb: {
      deviceList: () => Promise.resolve(mockDeviceList),
      requestDevice: () => {
        throw new Error("No request device implemented in mocked mode");
      },
    },
    dfu: mockDfu,
    ...extras,
  });
