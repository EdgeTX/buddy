import { UsbApi } from "shared/backend/types";

export const goodDevice = {
  productName: "Good device",
  vendorId: 1,
  productId: 1,
  opened: true,
  close: () => Promise.resolve(),
} as USBDevice;

export const lockedDevice = {
  productName: "Locked device",
  vendorId: 7,
  productId: 7,
  // We are using the opened variable as a way
  // to consider the device "detatched"
  opened: true,
  reset() {
    // @ts-expect-error we are changing this but oh well
    // eslint-disable-next-line functional/no-this-expression
    this.opened = false;
  },
  close: () => Promise.resolve(),
} as USBDevice;

export const disconnectBugDevice = {
  productName: "Disconnect bug device",
  vendorId: 6,
  productId: 6,
  opened: true,
  close: () => Promise.resolve(),
} as USBDevice;

export const badDevice = {
  productName: "Bad device",
  vendorId: 2,
  productId: 2,
  opened: true,
  close: () => Promise.resolve(),
} as USBDevice;

export const errorFlashingDevice = {
  productName: "Error flashing device",
  vendorId: 3,
  productId: 3,
  opened: true,
  close: () => Promise.resolve(),
} as USBDevice;

export const errorErasingDevice = {
  productName: "Error flashing device",
  vendorId: 4,
  productId: 4,
  opened: true,
  close: () => Promise.resolve(),
} as USBDevice;

export const mockDeviceList = [
  goodDevice,
  lockedDevice,
  disconnectBugDevice,
  badDevice,
  errorFlashingDevice,
  errorErasingDevice,
];

export const createMockUsb = (): UsbApi => ({
  deviceList: () =>
    Promise.resolve(mockDeviceList.filter((device) => device.opened)),
  requestDevice: () => {
    throw new Error("No request device implemented in mocked mode");
  },
});
