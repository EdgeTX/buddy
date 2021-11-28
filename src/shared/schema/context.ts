import { Octokit } from "@octokit/core";
import ky from "ky";
import * as firmwareStore from "./services/firmwareStore";

const TEST = atob("Z2hwX2phMzJ1RUNDbmZsUzR1d05jY2FIRzR2N2s0Z1k1QTJwMDVRVQ==");

export type Context = {
  github: Octokit['request'];
  firmwareStore: typeof firmwareStore;
};

const octokit = new Octokit({
  auth: TEST,
  request: {
    fetch: ky
  }
});

export const context = (): Context => ({
  github: octokit.request,
  firmwareStore,
});
