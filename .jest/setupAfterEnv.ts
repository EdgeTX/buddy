import dotenv from "dotenv";
import { jest, beforeEach } from "@jest/globals";
import nock from "nock";
import isCI from "is-ci";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { Blob } from "buffer";

// Text Encoder doesn't existing on jsdom
import { TextEncoder, TextDecoder } from "util";
global.TextEncoder = TextEncoder as unknown as typeof global.TextEncoder;
global.TextDecoder = TextDecoder as unknown as typeof global.TextDecoder;

globalThis.Blob = Blob as unknown as typeof globalThis.Blob;

dotenv.config();

jest.mock("dfu", () => ({
  WebDFU: () => {},
}));

// @ts-expect-error Oh well
navigator.usb = {
  requestDevice: () => {},
  deviceList: () => {},
};

nock.back.fixtures = `${dirname(
  fileURLToPath(import.meta.url)
)}/../__fixtures__`;

beforeEach(() => {
  nock.back.setMode(isCI ? "lockdown" : "record");
});
