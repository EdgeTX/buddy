import * as path from "path";
import { ElectronApplication, Page } from "playwright";
import { baseTest } from "../config/baseTest";
import { PageTestFixtures, PageWorkerFixtures } from "../types";

export { expect } from "@playwright/test";

type ElectronTestFixtures = PageTestFixtures & {
  electronApp: ElectronApplication;
  newWindow: () => Promise<Page>;
};

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

  electronApp: async ({ playwright }, run) => {
    // This env prevents 'Electron Security Policy' console message.
    process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";
    // eslint-disable-next-line no-underscore-dangle
    const electronApp = await playwright._electron.launch({
      args: [path.join(__dirname, "electron-app.js")],
    });
    await run(electronApp);
    await electronApp.close();
  },

  page: async ({ electronApp }, run) => {
    await run(await electronApp.firstWindow());
  },
});
