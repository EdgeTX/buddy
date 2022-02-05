import type {
  Config,
  PlaywrightTestOptions,
  PlaywrightWorkerOptions,
} from "@playwright/test";
import path from "path";
import { electronMain, pathExists, binaryPath } from "./utils";
import { dev } from "./env";

process.env.PWPAGE_IMPL = "electron";

if (dev && !pathExists(electronMain)) {
  throw new Error("E2E tests expect buddy to be running");
} else if (!dev && !pathExists(binaryPath())) {
  throw new Error("Production e2e tests expect buddy to be built");
}

const outputDir = path.join(__dirname, "..", "..", "e2e-recordings");
const testDir = path.join(__dirname, "..");
const config: Config<PlaywrightWorkerOptions & PlaywrightTestOptions> = {
  testDir,
  outputDir,
  timeout: 30000,
  globalTimeout: 5400000,
  reportSlowTests: { max: 0, threshold: 60000 },
  workers: process.env.CI ? 1 : undefined,
  forbidOnly: !!process.env.CI,
  preserveOutput: process.env.CI ? "failures-only" : "always",
  retries: process.env.CI ? 3 : 0,
  reporter: process.env.CI
    ? [["list"], ["github"], ["html", { open: "on-failure" }]]
    : [["list"], ["html", { open: "on-failure" }]],
  projects: [],
};

const trace = !!process.env.PWTEST_TRACE;
const video = !!process.env.PWTEST_VIDEO;
const headed = !!process.env.HEADFUL;

const metadata = {
  platform: process.platform,
  headful: headed,
  browserName: "electron",
  channel: undefined,
  mode: "default",
  video,
  trace,
};

config.projects?.push({
  name: "electron",
  use: {
    browserName: "chromium",
  },
  testDir: path.join(testDir, "electron"),
  metadata,
});

config.projects?.push({
  name: "electron",
  use: {
    browserName: "chromium",
  },
  testDir: path.join(testDir, "pages"),
  metadata,
});

export default config;
