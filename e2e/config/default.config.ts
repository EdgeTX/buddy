import type {
  Config,
  PlaywrightTestOptions,
  PlaywrightWorkerOptions,
} from "@playwright/test";
import path from "path";

type BrowserName = "chromium" | "firefox" | "webkit";

const getExecutablePath = (browserName: BrowserName) => {
  if (browserName === "chromium" && process.env.CRPATH) {
    return process.env.CRPATH;
  }
  if (browserName === "firefox" && process.env.FFPATH) {
    return process.env.FFPATH;
  }
  if (browserName === "webkit" && process.env.WKPATH) {
    return process.env.WKPATH;
  }
  return undefined;
};

const mode = process.env.PW_OUT_OF_PROCESS_DRIVER
  ? "driver"
  : ((process.env.PWTEST_MODE ?? "default") as
      | "default"
      | "driver"
      | "service");
const headed = !!process.env.HEADFUL;
const channel = process.env.PWTEST_CHANNEL as any;
const video = !!process.env.PWTEST_VIDEO;
const trace = !!process.env.PWTEST_TRACE;

const outputDir = path.join(__dirname, "..", "..", "e2e-recordings");
const testDir = path.join(__dirname, "..");
const config: Config<PlaywrightWorkerOptions & PlaywrightTestOptions> = {
  testDir,
  outputDir,
  expect: {
    timeout: 10000,
  },
  timeout: video ? 60000 : 30000,
  globalTimeout: 5400000,
  workers: process.env.CI ? 1 : undefined,
  forbidOnly: !!process.env.CI,
  reportSlowTests: { max: 0, threshold: 60000 },
  preserveOutput: process.env.CI ? "failures-only" : "always",
  retries: process.env.CI ? 3 : 0,
  reporter: process.env.CI
    ? [["list"], ["github"], ["html", { open: "on-failure" }]]
    : [["list"], ["html", { open: "on-failure" }]],
  projects: [],
  webServer: {
    command: "yarn serve:web",
    reuseExistingServer: !process.env.CI,
    port: 8081,
  },
};

const browserNames = ["chromium", "webkit", "firefox"] as BrowserName[];
// eslint-disable-next-line no-restricted-syntax
for (const browserName of browserNames) {
  const executablePath = getExecutablePath(browserName);
  if (executablePath && !process.env.TEST_WORKER_INDEX)
    // eslint-disable-next-line no-console
    console.error(`Using executable at ${executablePath}`);
  const devtools = process.env.DEVTOOLS === "1";
  const testIgnore: RegExp[] = browserNames
    .filter((b) => b !== browserName)
    .map((b) => new RegExp(b));
  testIgnore.push(/android/, /electron/, /playwright-test/);
  config.projects?.push({
    name: browserName,
    testDir,
    testIgnore,
    use: {
      baseURL: "http://localhost:8081/?mocked=true&e2e=true",
      browserName,
      headless: !headed,
      channel,
      video: video ? "on" : undefined,
      launchOptions: {
        executablePath,
        devtools,
      },
      trace: trace ? "on" : undefined,
    },
    metadata: {
      platform: process.platform,
      docker: !!process.env.INSIDE_DOCKER,
      headful: !!headed,
      browserName,
      channel,
      mode,
      video: !!video,
      trace: !!trace,
    },
  });
}

export default config;
