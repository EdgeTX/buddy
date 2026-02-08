import { test as browserTestImpl } from "../config/browserTest";
import { test as electronTestImpl } from "../electron/electronTest";

export { waitFor } from "@playwright-testing-library/test";
export { expect } from "@playwright/test";

export const firmwarePage = "#/flash";

// Conditionally export test based on environment
export const test =
  process.env.PWPAGE_IMPL === "electron" ? electronTestImpl : browserTestImpl;
