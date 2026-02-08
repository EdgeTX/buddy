import {
  fixtures,
  TestingLibraryFixtures,
} from "@playwright-testing-library/test/fixture";
import { platformTest } from "./platformFixtures";

export const baseTest = platformTest.extend<
  TestingLibraryFixtures & { _snapshotSuffix: string },
  { _snapshotSuffix: string }
>({
  ...fixtures,
  _snapshotSuffix: ["", { scope: "worker" }],
});
