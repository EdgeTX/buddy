import type {
  Config,
  PlaywrightTestOptions,
  PlaywrightWorkerOptions,
} from "@playwright/test";
import path from "path";
import fs from "fs";
import os from "os";

process.env.PWPAGE_IMPL = "electron";

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
      return path.join(__dirname, "dist/linux-unpacked/edgetx-buddy");
    case "darwin":
      return path.join(
        __dirname,
        "dist/mac/EdgeTX Buddy.app/Contents/MacOS/EdgeTX Buddy"
      );
    case "win32":
      return path.join(__dirname, "dist/win-unpacked/EdgeTX Buddy.exe");
    default:
      throw new Error("Unknown OS");
  }
};

const outputDir = path.join(__dirname, "..", "..", "test-results");
const testDir = path.join(__dirname, "..");
const config: Config<PlaywrightWorkerOptions & PlaywrightTestOptions> = {
  testDir,
  outputDir,
  timeout: 30000,
  globalTimeout: 5400000,
  workers: process.env.CI ? 1 : undefined,
  forbidOnly: !!process.env.CI,
  preserveOutput: process.env.CI ? "failures-only" : "always",
  retries: process.env.CI ? 3 : 0,
  reporter: process.env.CI
    ? [["dot"], ["json", { outputFile: path.join(outputDir, "report.json") }]]
    : "line",
  projects: [],
};

const metadata = {
  platform: process.platform,
  headful: true,
  browserName: "electron",
  channel: undefined,
  mode: "default",
  video: false,
};

config.projects?.push({
  name: "chromium",
  use: {
    browserName: "chromium",
  },
  testDir: path.join(testDir, "electron"),
  metadata,
});

config.projects?.push({
  name: "chromium",
  use: {
    browserName: "chromium",
  },
  testDir: path.join(testDir, "page"),
  metadata,
});

export default config;
