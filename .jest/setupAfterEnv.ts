import { jest } from "@jest/globals";
import nock from "nock";
import isCI from "is-ci";

jest.mock("dfu", () => ({
  WebDFU: () => {},
}));

nock.back.fixtures = `${__dirname}/../__fixtures__`;
nock.back.setMode(isCI ? "lockdown" : "record");
