import { createCrossBoundryFunction } from "./utils";

export const requestDevice = createCrossBoundryFunction<
  (
    ...params: Parameters<typeof navigator.usb.requestDevice>
  ) => Promise<Pick<USBDevice, "vendorId" | "productId">>
>("usb.requestDevice", async (options) => {
  const device = await navigator.usb.requestDevice(options);
  return {
    vendorId: device.vendorId,
    productId: device.productId,
  };
});

export const showDirectoryPicker = createCrossBoundryFunction<
  typeof window.showDirectoryPicker
>("showDirectoryPicker", async (options) => {
  const handle = await window.showDirectoryPicker(options);

  // We can't request permission in the worker context, so do that here
  await handle.getFileHandle(".edgetxbuddypermissions.txt", {
    create: true,
  });
  await handle.removeEntry(".edgetxbuddypermissions.txt");

  return handle;
});
