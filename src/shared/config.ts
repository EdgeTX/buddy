// TODO: fix the types for these, use separate tsconfigs for different envs
const isElectron =
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  !!global.window?.ipcRenderer ||
  !!(
    typeof process !== "undefined" &&
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    process.release?.name === "node"
  );

const isWebworker = !isElectron && !global.window;

const E2E = process.env.E2E === "true";
const PRODUCTION = process.env.NODE_ENV === "production";

const extractParam = (key: string): string | null =>
  new URLSearchParams(window.location.search.slice(1)).get(key);

export default {
  isElectron,
  proxyUrl: isElectron ? "" : process.env.PROXY_URL ?? "",
  isProduction: PRODUCTION,
  isE2e: E2E,
  github: {
    // If you need the API key to record new APIs, change this
    // line. The github API limits are 50/hour you should be ok
    // when writing tests
    apiKey:
      process.env.NODE_ENV === "test" ? undefined : process.env.GITHUB_API_KEY,
    organization: "EdgeTX",
    repos: {
      firmware: "edgetx",
      sdcard: "edgetx-sdcard",
      sounds: "edgetx-sdcard-sounds",
      themes: "edgetx-themes",
    },
  },
  isMocked:
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    isElectron || isWebworker
      ? process.env.MOCKED === "true"
      : extractParam("mocked") === "true",
};
