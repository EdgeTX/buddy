import { FileSystemApi } from "shared/backend/types";
import { createContext } from "shared/backend/context";
import { createDfuMock } from "./dfu";
import { createMockUsb } from "./usb";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const createMockContext = (
  extras: {
    fileSystem: FileSystemApi;
  },
  options?: {
    faster?: boolean;
  }
) =>
  createContext({
    usb: createMockUsb(),
    dfu: createDfuMock(options?.faster),
    ...extras,
  });
