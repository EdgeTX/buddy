// Separated config for backend as these values are only used here

export default {
  // These values are not injected at build time
  proxyUrl: process.env.PROXY_URL,
  downloadDirectory: process.env.DOWNLOAD_DIR,
  github: {
    // This is for now required to download PR builds
    // it's injected at build time
    prBuildsKey: process.env.GITHUB_PR_BUILDS_KEY,
    organization: "EdgeTX",
    repos: {
      firmware: "edgetx",
      sdcard: "edgetx-sdcard",
      sounds: "edgetx-sdcard-sounds",
      themes: "edgetx-themes",
    },
  },
};
