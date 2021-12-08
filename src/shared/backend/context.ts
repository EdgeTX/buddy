import { Octokit } from "@octokit/core";
import ky from "ky";
import config from "shared/config";
import * as firmwareStore from "./services/firmwareStore";
import * as dfu from "./services/dfu";
import * as sdcardAssets from "./services/sdcardAssets";
import { FileSystemApi, UsbApi } from "./types";

export type Context = {
  github: Octokit["request"];
  firmwareStore: typeof firmwareStore;
  dfu: typeof dfu;
  usb: UsbApi;
  fileSystem: FileSystemApi;
  sdcardAssets: typeof sdcardAssets;
};

const octokit = new Octokit({
  auth: config.github.apiKey,
  request: {
    fetch: ky,
  },
});

export const createContext =
  (extras: { fileSystem: FileSystemApi; usb: UsbApi }) => (): Context => ({
    github: octokit.request,
    firmwareStore,
    dfu,
    sdcardAssets,
    ...extras,
  });
