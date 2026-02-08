import { test } from "@playwright/test";
import {
  fixtures,
  TestingLibraryFixtures,
} from "@playwright-testing-library/test/fixture";
import {
  PlatformTestFixtures,
  PlatformWorkerFixtures,
} from "./platformFixtures";

export const baseTest = test.extend<
  TestingLibraryFixtures & PlatformTestFixtures,
  PlatformWorkerFixtures & { _snapshotSuffix: string }
>({
  ...fixtures,
  // Platform fixtures
  platform: [
    process.platform as "win32" | "darwin" | "linux",
    { scope: "worker" },
  ],
  isWindows: [process.platform === "win32", { scope: "worker" }],
  isMac: [process.platform === "darwin", { scope: "worker" }],
  isLinux: [process.platform === "linux", { scope: "worker" }],
  // eslint-disable-next-line no-empty-pattern
  tempDownloadDir: async ({}, run) => {
    const tmpPromise = await import("tmp-promise");
    await tmpPromise.default.withDir(
      async (tempDirectory) => {
        await run(tempDirectory.path);
      },
      { unsafeCleanup: true }
    );
  },
  _snapshotSuffix: ["", { scope: "worker" }],
});
