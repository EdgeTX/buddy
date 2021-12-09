export const goodDevice = {
  productName: "Good device",
  vendorId: 1,
  productId: 1,
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
  badDevice,
  errorFlashingDevice,
  errorErasingDevice,
];
