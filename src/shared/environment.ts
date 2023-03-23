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

export default {
  isWebworker,
  isElectron,
  isMain,
  os: browser?.os,
};
