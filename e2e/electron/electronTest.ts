import path from "path";
import fs from "fs";
import os from "os";
import { baseTest } from "../config/baseTest";
import { ElectronTestFixtures, PageWorkerFixtures } from "../types";

export { expect } from "@playwright/test";

const DEV = !!process.env.DEV;
const HEADLESS = !process.env.HEADFUL;
const video = !!process.env.PWTEST_VIDEO;

const exists = (filePath: string) => {
  try {
    fs.accessSync(filePath);
    return true;
  } catch (_) {
    return false;
  }
};

const binaryPath = () => {
  switch (os.platform()) {
    case "linux":
      return path.join(__dirname, "../../dist/linux-unpacked/edgetx-buddy");
    case "darwin":
      return path.join(
        __dirname,
        "../../dist/mac/EdgeTX Buddy.app/Contents/MacOS/EdgeTX Buddy"
      );
    case "win32":
      return path.join(__dirname, "../../dist/win-unpacked/EdgeTX Buddy.exe");
    default:
      throw new Error("Unknown OS");
  }
};

// eslint-disable-next-line
const electronVersion = require("electron/package.json").version as string;

const main = path.join(__dirname, "build/main.js");
if (DEV && !exists(main)) {
  throw new Error("E2E tests expect buddy to be running");
} else if (!DEV && !exists(binaryPath())) {
  throw new Error("Production e2e tests expect buddy to be built");
}

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
      executablePath: !DEV ? binaryPath() : undefined,
      args: !DEV ? undefined : [path.join(__dirname, "build/main.js")],
      env: {
        ...process.env,
        E2E: "true",
        HEADLESS: HEADLESS ? "true" : "false",
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
