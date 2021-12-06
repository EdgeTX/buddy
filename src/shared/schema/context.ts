import { Octokit } from "@octokit/core";
import ky from "ky-universal";
import * as firmwareStore from "./services/firmwareStore";
import * as dfu from "./services/dfu";
import { FileSystemApi, UsbApi } from "./types";

const TEST = atob("Z2hwX2phMzJ1RUNDbmZsUzR1d05jY2FIRzR2N2s0Z1k1QTJwMDVRVQ==");

export type Context = {
  github: Octokit["request"];
  firmwareStore: typeof firmwareStore;
  dfu: typeof dfu;
  usb: UsbApi;
  fileSystem: FileSystemApi;
};

const octokit = new Octokit({
  auth: TEST,
  request: {
    fetch: ky,
  },
});

export const createContext =
  (extras: { fileSystem: FileSystemApi; usb: UsbApi }) => (): Context => ({
    github: octokit.request,
    firmwareStore,
    dfu,
    ...extras,
  });
