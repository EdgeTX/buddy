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

export const reconnect = async (
  deviceList: () => Promise<USBDevice[]>,
  vendorId: number,
  productId: number,
  options?: {
    timeoutMs?: number;
    pollIntervalMs?: number;
    onPoll?: () => void;
  }
): Promise<WebDFU> => {
  const { timeoutMs = 5000, pollIntervalMs = 200, onPoll } = options ?? {};
  const timeout = new Promise<never>((_, reject) =>
    // eslint-disable-next-line no-promise-executor-return
    setTimeout(() => reject(new Error("Timeout reconnecting!")), timeoutMs)
  );

  const tryReconnect = async (): Promise<WebDFU | undefined> => {
    const devices = await deviceList();
    const device = devices.find(
      (d) => d.vendorId === vendorId && d.productId === productId
    );

    if (device) {
      return connect(device).catch(() => undefined);
    }

    return undefined;
  };

  const reconnectLoop = async (): Promise<WebDFU> => {
    while (true) {
      onPoll?.();

      // eslint-disable-next-line no-await-in-loop
      const dfuProcess = await tryReconnect();
      if (dfuProcess) return dfuProcess;

      // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }
  };

  return Promise.race([reconnectLoop(), timeout]);
};
