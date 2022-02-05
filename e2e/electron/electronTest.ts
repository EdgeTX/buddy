import path from "path";
import { baseTest } from "../config/baseTest";
import { dev, headed, video } from "../config/env";
import { binaryPath, electronMain } from "../config/utils";
import { ElectronTestFixtures, PageWorkerFixtures } from "../types";

export { expect } from "@playwright/test";

// eslint-disable-next-line
const electronVersion = require("electron/package.json").version as string;

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
export const electronTest = baseTest.extend<
  ElectronTestFixtures,
  PageWorkerFixtures
>({
  browserVersion: [electronVersion, { scope: "worker" }],
  browserMajorVersion: [
    Number(electronVersion.split(".")[0]),
    { scope: "worker" },
  ],
  isAndroid: [false, { scope: "worker" }],
  isElectron: [true, { scope: "worker" }],

  electronApp: async ({ playwright, tempDownloadDir }, run) => {
    // This env prevents 'Electron Security Policy' console message.
    process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";
    // eslint-disable-next-line no-underscore-dangle
    const electronApp = await playwright._electron.launch({
      executablePath: !dev ? binaryPath() : undefined,
      args: !dev ? undefined : [electronMain],
      env: {
        ...process.env,
        E2E: "true",
        HEADLESS: !headed ? "true" : "false",
        DOWNLOAD_DIR: tempDownloadDir,
      },
      recordVideo: video
        ? {
            dir: path.join(__dirname, "../../e2e-recordings"),
          }
        : undefined,
    });

    await run(electronApp);
    await electronApp.close();
  },

  page: async ({ electronApp }, run) => {
    await run(await electronApp.firstWindow());
  },
});
