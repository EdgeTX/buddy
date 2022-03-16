import { WebDFU } from "shared/dfu";

export const connect = async (
  device: USBDevice
): Promise<WebDFU | undefined> => {
  const dfu = new WebDFU(
    device,
    { forceInterfacesName: true },
    { info: console.log, progress: console.log, warning: console.log }
  );

  console.log("Initialising");

  await dfu.init();

  if (dfu.interfaces.length === 0) {
    throw new Error("Device does not have any USB DFU interfaces.");
  }

  console.log("connecting");
  await dfu.connect(0);
  console.log("configuring");
  if (await dfu.isError()) {
    await dfu.clearStatus();
  }

  return dfu;
};
