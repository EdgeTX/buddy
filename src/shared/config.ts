const isElectron =
  !!(global.window && global.window.ipcRenderer) ||
  !!(
    typeof process !== "undefined" &&
    process.release &&
    process.release.name === "node"
  );

export default {
  isElectron: isElectron,
  proxyUrl: isElectron ? "" : "http://localhost:12000",
};
