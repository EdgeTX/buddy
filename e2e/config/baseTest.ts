import { test, TestType, Fixtures } from "@playwright/test";
import {
  fixtures,
  TestingLibraryFixtures,
} from "@playwright-testing-library/test/fixture";
import { platformTest } from "./platformFixtures";

type TestTypeEx<TestArgs, WorkerArgs> = {
  extend<T, W = Record<never, never>>(
    fixtures: Fixtures<T, W, TestArgs, WorkerArgs>
  ): TestTypeEx<TestArgs & T, WorkerArgs & W>;
  _extendTest<T, W>(
    other: TestType<T, W>
  ): TestTypeEx<TestArgs & T, WorkerArgs & W>;
} & TestType<TestArgs, WorkerArgs>;
type BaseT = typeof test extends TestType<infer T, infer W> ? T : never; // eslint-disable-line
type BaseW = typeof test extends TestType<infer T, infer W> ? W : never; // eslint-disable-line
export const base = test as TestTypeEx<BaseT, BaseW>;

// eslint-disable-next-line no-underscore-dangle
export const baseTest = base
  ._extendTest(platformTest)
  .extend<TestingLibraryFixtures>(fixtures)
  .extend<Record<never, never>, { _snapshotSuffix: string }>({
    _snapshotSuffix: ["", { scope: "worker" }],
  });
