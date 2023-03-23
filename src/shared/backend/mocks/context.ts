import { FileSystemApi } from "shared/backend/types";
import { createContext } from "shared/backend/context";
import { GithubClient } from "shared/api/github";
import { createDfuMock } from "./dfu";
import { createMockUsb } from "./usb";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const createMockContext = (
  extras: {
    fileSystem: FileSystemApi;
    github: GithubClient;
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
