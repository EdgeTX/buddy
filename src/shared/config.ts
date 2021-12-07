const isElectron =
  !!(global.window && global.window.ipcRenderer) ||
  !!(
    typeof process !== "undefined" &&
    process.release &&
    process.release.name === "node"
  );

const E2E = process.env.E2E === "true";
const PRODUCTION = process.env.NODE_ENV === "production";

export default {
  isElectron: isElectron,
  proxyUrl: isElectron ? "" : process.env.PROXY_URL,
  isProduction: PRODUCTION,
  isE2e: E2E,
};
