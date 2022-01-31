import { TestType } from "@playwright/test";
import { PlatformWorkerFixtures } from "../config/platformFixtures";
// import { androidTest } from '../android/androidTest';
import { browserTest } from "../config/browserTest";
import { electronTest } from "../electron/electronTest";
import { PageTestFixtures, PageWorkerFixtures } from "./pageTestApi";
import { ServerFixtures, ServerWorkerOptions } from "../config/serverFixtures";

export { expect } from "@playwright/test";

let impl: TestType<
  PageTestFixtures & ServerFixtures,
  PageWorkerFixtures & PlatformWorkerFixtures & ServerWorkerOptions
> = browserTest;

// if (process.env.PWPAGE_IMPL === 'android')
//   impl = androidTest;
if (process.env.PWPAGE_IMPL === "electron") impl = electronTest;

export const test = impl;
