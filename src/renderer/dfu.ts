import { WebDFU } from "dfu";

export async function flash(firmware: Buffer) {
  // Load the device by WebUSB
  const selectedDevice = await navigator.usb.requestDevice({ filters: [] });

  // Create and init the WebDFU instance
  const webdfu = new WebDFU(
    selectedDevice,
    { forceInterfacesName: true },
    { info: console.log, progress: console.log, warning: console.log }
  );
  await webdfu.init();

  if (webdfu.interfaces.length === 0) {
    throw new Error(
      "The selected device does not have any USB DFU interfaces."
    );
  }

  console.log(webdfu.interfaces);
  // Connect to first device interface
  await webdfu.connect(0);

  console.log({
    Version: webdfu.properties?.DFUVersion.toString(16),
    CanUpload: webdfu.properties?.CanUpload,
    CanDownload: webdfu.properties?.CanDownload,
    TransferSize: webdfu.properties?.TransferSize,
    DetachTimeOut: webdfu.properties?.DetachTimeOut,
  });

  if (await webdfu.isError()) {
    await webdfu.clearStatus();
  }

  // Write firmware to device
  try {
    // Your firmware in binary mode
    const process = webdfu.write(1024, firmware, true);

    await new Promise((resolve, reject) => {
      process.events.on("error", (err) => {
        console.log(err);
      });

      process.events.on("erase/process", (progress) => {
        console.log("Erase", progress);
      });

      process.events.on("write/process", (progress) => {
        console.log("Write", progress);
      });

      process.events.on("end", () => resolve(undefined));
    });

    console.log("Written!");
  } catch (error) {
    console.error(error);
  }
}
