import fs from "fs";
import os from "os";
import path from "path";
import type {
  BrowserContext,
  BrowserContextOptions,
  BrowserType,
  Page,
} from "playwright-core";
import { PageTestFixtures, PageWorkerFixtures } from "../types";
import { baseTest } from "./baseTest";

export type BrowserTestWorkerFixtures = PageWorkerFixtures & {
  browserVersion: string;
  browserMajorVersion: number;
  browserType: BrowserType;
  isAndroid: boolean;
  isElectron: boolean;
};

type BrowserTestTestFixtures = PageTestFixtures & {
  createUserDataDir: () => Promise<string>;
  launchPersistent: (
    options?: Parameters<BrowserType["launchPersistentContext"]>[1]
  ) => Promise<{ context: BrowserContext; page: Page }>;
  contextFactory: (options?: BrowserContextOptions) => Promise<BrowserContext>;
};

const test = baseTest.extend<
  BrowserTestTestFixtures,
  BrowserTestWorkerFixtures
>({
  browserVersion: [
    async ({ browser }, run) => {
      await run(browser.version());
    },
    { scope: "worker" },
  ],

  browserType: [
    async ({ playwright, browserName }, run) => {
      await run(playwright[browserName]);
    },
    { scope: "worker" },
  ],

  browserMajorVersion: [
    async ({ browserVersion }, run) => {
      await run(Number(browserVersion.split(".")[0]));
    },
    { scope: "worker" },
  ],

  isAndroid: [false, { scope: "worker" }],
  isElectron: [false, { scope: "worker" }],

  contextFactory: async ({ _contextFactory }: any, run) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await run(_contextFactory);
  },

  createUserDataDir: async (_, run) => {
    const dirs: string[] = [];
    // We do not put user data dir in testOutputPath,
    // because we do not want to upload them as test result artifacts.
    //
    // Additionally, it is impossible to upload user data dir after test run:
    // - Firefox removes lock file later, presumably from another watchdog process?
    // - WebKit has circular symlinks that makes CI go crazy.
    await run(async () => {
      const dir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), "playwright-test-")
      );
      dirs.push(dir);
      return dir;
    });
    await Promise.all(dirs.map((dir) => fs.promises.rmdir(dir)));
  },

  launchPersistent: async ({ createUserDataDir, browserType }, run) => {
    let persistentContext: BrowserContext | undefined;
    await run(async (options) => {
      if (persistentContext)
        throw new Error("can only launch one persistent context");
      const userDataDir = await createUserDataDir();
      persistentContext = await browserType.launchPersistentContext(
        userDataDir,
        { ...options }
      );
      const page = persistentContext.pages()[0]!;
      return { context: persistentContext, page };
    });
    if (persistentContext) await persistentContext.close();
  },
});

export const playwrightTest = test;
export const browserTest = test;
export const contextTest = test;

export { expect } from "@playwright/test";