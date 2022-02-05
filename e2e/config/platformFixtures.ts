import { test } from "@playwright/test";
import tmp from "tmp-promise";

export type PlatformTestFixtures = {
  tempDownloadDir: string;
};

export type PlatformWorkerFixtures = {
  platform: "win32" | "darwin" | "linux";
  isWindows: boolean;
  isMac: boolean;
  isLinux: boolean;
};

export const platformTest = test.extend<
  PlatformTestFixtures,
  PlatformWorkerFixtures
>({
  platform: [
    process.platform as "win32" | "darwin" | "linux",
    { scope: "worker" },
  ],
  isWindows: [process.platform === "win32", { scope: "worker" }],
  isMac: [process.platform === "darwin", { scope: "worker" }],
  isLinux: [process.platform === "linux", { scope: "worker" }],
  // eslint-disable-next-line no-empty-pattern
  tempDownloadDir: async ({}, run) => {
    await tmp.withDir(
      async (tempDirectory) => {
        await run(tempDirectory.path);
      },
      { unsafeCleanup: true }
    );
  },
});
