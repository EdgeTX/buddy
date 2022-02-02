import { TestType } from "@playwright/test";
import { TestingLibraryFixtures } from "@playwright-testing-library/test/fixture";
import { PlatformWorkerFixtures } from "../config/platformFixtures";
// import { androidTest } from '../android/androidTest';
import { browserTest } from "../config/browserTest";
import { electronTest } from "../electron/electronTest";
import { PageTestFixtures, PageWorkerFixtures } from "../types";

export { expect } from "@playwright/test";

let impl: TestType<
  PageTestFixtures & TestingLibraryFixtures,
  PageWorkerFixtures & PlatformWorkerFixtures
> = browserTest;

// if (process.env.PWPAGE_IMPL === 'android')
//   impl = androidTest;
if (process.env.PWPAGE_IMPL === "electron") impl = electronTest;

export const firmwarePage = "#/flash";
export const test = impl;
