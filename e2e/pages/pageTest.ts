import { TestType } from "@playwright/test";
import { TestingLibraryFixtures } from "@playwright-testing-library/test/fixture";
import {
  PlatformWorkerFixtures,
  PlatformTestFixtures,
} from "../config/platformFixtures";
// import { androidTest } from '../android/androidTest';
import { browserTest } from "../config/browserTest";
import { electronTest } from "../electron/electronTest";
import { PageTestFixtures, PageWorkerFixtures } from "../types";

export { waitFor } from "@playwright-testing-library/test";

export { expect } from "@playwright/test";

let impl: TestType<
  PageTestFixtures & PlatformTestFixtures & TestingLibraryFixtures,
  PageWorkerFixtures & PlatformWorkerFixtures
> = browserTest;

const isElectron = process.env.PWPAGE_IMPL === "electron";

// if (process.env.PWPAGE_IMPL === 'android')
//   impl = androidTest;
if (isElectron) impl = electronTest;

export const firmwarePage = "#/flash";
export const test = impl;
