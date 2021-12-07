import crossBoundary from "./crossBoundary";

const worker = new Worker(new URL("./webworker.worker.ts", import.meta.url));

crossBoundary.showDirectoryPicker.installHandler(worker, async (options) => {
  const handle = await window.showDirectoryPicker(options);

  // We can't request permission in the worker context, so do that here
  await handle.getFileHandle("edgetxflasherpermissions.txt", { create: true });
  await handle.removeEntry("edgetxflasherpermissions.txt");

  return handle;
});

crossBoundary.requestDevice.installHandler(worker, async (options) => {
  const device = await navigator.usb.requestDevice(options);
  return {
    vendorId: device.vendorId,
    productId: device.productId,
  };
});

export default worker;
