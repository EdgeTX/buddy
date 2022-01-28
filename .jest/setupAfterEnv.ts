import "@testing-library/jest-dom";
import "jest-styled-components";
import dotenv from "dotenv";
import { jest } from "@jest/globals";
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

jest.mock("styled-components", () => {
  const actual = jest.requireActual(
    "styled-components"
  ) as typeof import("styled-components");
  const styled = actual.default;

  return Object.assign(styled, actual);
});

jest.mock("use-media", () => {
  const actual = jest.requireActual("use-media") as typeof import("use-media");
  const useMedia = actual.default;

  return Object.assign(useMedia, actual);
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

jest.unstable_mockModule("copy-text-to-clipboard", () => ({
  default: jest.fn(),
}));

jest.mock("js-file-download", () => jest.fn());
jest.mock("renderer/assets/logo.webp", () => "logo-image-data");

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

// For ESM, jest isn't available globally, so let's set it
// @ts-expect-error
globalThis.jest = jest;

const origConsoleError = console.error;

console.error = (message, ...others) => {
  // Ant is doing something weird with popinner, oh well don't spam the console
  if (others.includes("PopupInner")) {
    return;
  }

  return origConsoleError.call(console, message, ...others);
};

afterAll(() => {
  console.error = origConsoleError;
});
