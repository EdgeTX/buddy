import { detect } from "detect-browser";

// TODO: fix the types for these, use separate tsconfigs for different envs
const isElectron =
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  !!global.window?.ipcRenderer;

const browser = detect();

const isMain = !!(
  typeof process !== "undefined" &&
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  process.release?.name === "node"
);

const isWebworker = (!isMain && !global.window) as boolean;

const E2E = process.env.E2E === "true";
const PRODUCTION = process.env.NODE_ENV === "production";

const extractParam = (key: string): string | null =>
  !isMain && !isWebworker
    ? new URLSearchParams(window.location.search.slice(1)).get(key)
    : null;

export default {
  isMain,
  isElectron,
  proxyUrl: process.env.PROXY_URL,
  downloadDirectory: process.env.DOWNLOAD_DIR,
  isProduction: PRODUCTION,
  isE2e: isMain ? E2E : extractParam("e2e") === "true",
  github: {
    // If you need the API key to record new APIs, change this
    // line. The github API limits are 50/hour you should be ok
    // when writing tests
    apiKey:
      process.env.NODE_ENV === "test" ? undefined : process.env.GITHUB_API_KEY,
    // This is for now required to download PR builds
    prBuildsKey: process.env.GITHUB_PR_BUILDS_KEY,
    organization: "EdgeTX",
    repos: {
      firmware: "edgetx",
      sdcard: "edgetx-sdcard",
      sounds: "edgetx-sdcard-sounds",
      themes: "edgetx-themes",
    },
  },
  isMocked: isMain
    ? process.env.MOCKED === "true"
    : extractParam("mocked") === "true",
  isNewUI: extractParam("next") === "true",
  os: browser?.os,
};
