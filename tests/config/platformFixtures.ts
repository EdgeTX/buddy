import { test } from "@playwright/test";

export type PlatformWorkerFixtures = {
  platform: "win32" | "darwin" | "linux";
  isWindows: boolean;
  isMac: boolean;
  isLinux: boolean;
};

export const platformTest = test.extend<
  Record<never, never>,
  PlatformWorkerFixtures
>({
  platform: [
    process.platform as "win32" | "darwin" | "linux",
    { scope: "worker" },
  ],
  isWindows: [process.platform === "win32", { scope: "worker" }],
  isMac: [process.platform === "darwin", { scope: "worker" }],
  isLinux: [process.platform === "linux", { scope: "worker" }],
});
