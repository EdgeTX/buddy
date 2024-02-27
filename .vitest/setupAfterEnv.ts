import "@testing-library/jest-dom";
import "jest-styled-components";
import dotenv from "dotenv";
import { vi } from "vitest";
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

vi.mock("shared/dfu", () => ({
  WebDFU: () => {},
}));

// vi.mock("styled-components", () => {
//   const actual = vi.importActual(
//     "styled-components"
//   ) as unknown as typeof import("styled-components");

//   return actual;
// });

vi.mock("react-ga", () => ({ exception: vi.fn() }));

// vi.mock("use-media", () => {
//   const actual = vi.importActual(
//     "use-media"
//   ) as unknown as typeof import("use-media");
//   const useMedia = actual.default;

//   return Object.assign(useMedia, actual);
// });

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

vi.mock("copy-text-to-clipboard");

vi.mock("js-file-download");

// @ts-expect-error Oh well
navigator.usb = {
  requestDevice: () => {},
  deviceList: () => {},
};

nock.back.fixtures = `${dirname(
  fileURLToPath(import.meta.url)
)}/../__fixtures__`;

beforeEach(() => {
  nock.back.setMode("lockdown");
});

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
