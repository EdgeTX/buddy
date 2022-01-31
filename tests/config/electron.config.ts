import type {
  Config,
  PlaywrightTestOptions,
  PlaywrightWorkerOptions,
} from "@playwright/test";
import * as path from "path";
import { CoverageWorkerOptions } from "./coverageFixtures";

process.env.PWPAGE_IMPL = "electron";

const outputDir = path.join(__dirname, "..", "..", "test-results");
const testDir = path.join(__dirname, "..");
const config: Config<
  CoverageWorkerOptions & PlaywrightWorkerOptions & PlaywrightTestOptions
> = {
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

config.projects.push({
  name: "chromium", // We use 'chromium' here to share screenshots with chromium.
  use: {
    browserName: "chromium",
    coverageName: "electron",
  },
  testDir: path.join(testDir, "electron"),
  metadata,
});

config.projects.push({
  name: "chromium", // We use 'chromium' here to share screenshots with chromium.
  use: {
    browserName: "chromium",
    coverageName: "electron",
  },
  testDir: path.join(testDir, "page"),
  metadata,
});

export default config;
