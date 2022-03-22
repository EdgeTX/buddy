import { WebDFU } from "shared/dfu";

export const connect = async (device: USBDevice): Promise<WebDFU> => {
  const dfu = new WebDFU(
    device,
    { forceInterfacesName: true },
    { info: console.log, progress: console.log, warning: console.log }
  );

  await dfu.init();

  if (dfu.interfaces.length === 0) {
    throw new Error("Device does not have any USB DFU interfaces.");
  }

  await dfu.connect(0);

  if (await dfu.isError()) {
    await dfu.clearStatus();
  }

  return dfu;
};
