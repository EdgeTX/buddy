import type { ObjectRef, outputShapeKey } from "@pothos/core";

export type FileSystemApi = {
  requestWritableDirectory: typeof window.showDirectoryPicker;
};

export type UsbApi = {
  requestDevice: typeof navigator.usb.requestDevice;
  deviceList: () => Promise<USBDevice[]>;
};

export type TypeOf<
  O extends ObjectRef<T>,
  T = unknown
> = O[typeof outputShapeKey];

// cloudbuild

export type JobStatus =
  | "VOID"
  | "WAITING_FOR_BUILD"
  | "BUILD_IN_PROGRESS"
  | "BUILD_SUCCESS"
  | "BUILD_ERROR";

export type Flags = {
  id: string;
  values: string[];
}[];

export type SelectedFlags = {
  name?: string;
  value?: string;
}[];
