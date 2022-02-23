import { UsbApi } from "shared/backend/types";

export const goodDevice = {
  productName: "Good device",
  vendorId: 1,
  productId: 1,
  close: () => Promise.resolve(),
} as USBDevice;

export const disconnectBugDevice = {
  productName: "Disconnect bug device",
  vendorId: 6,
  productId: 6,
  close: () => Promise.resolve(),
} as USBDevice;

export const badDevice = {
  productName: "Bad device",
  vendorId: 2,
  productId: 2,
  close: () => Promise.resolve(),
} as USBDevice;

export const errorFlashingDevice = {
  productName: "Error flashing device",
  vendorId: 3,
  productId: 3,
  close: () => Promise.resolve(),
} as USBDevice;

export const errorErasingDevice = {
  productName: "Error flashing device",
  vendorId: 4,
  productId: 4,
  close: () => Promise.resolve(),
} as USBDevice;

export const mockDeviceList = [
  goodDevice,
  disconnectBugDevice,
  badDevice,
  errorFlashingDevice,
  errorErasingDevice,
];

export const createMockUsb = (): UsbApi => ({
  deviceList: () => Promise.resolve(mockDeviceList),
  requestDevice: () => {
    throw new Error("No request device implemented in mocked mode");
  },
});
