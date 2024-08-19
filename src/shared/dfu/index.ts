/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable no-bitwise */
/* eslint-disable no-restricted-syntax */
/* eslint-disable functional/no-this-expression */
/* eslint-disable functional/no-class */
/**
 * Credit goes to https://github.com/flipperdevices/webdfu for this sourcecode,
 * we have made some additions as the main library is unmaintained and has some
 * bugs.
 *
 * If the library is updated to include our changes we can switch back to it
 */
import { createNanoEvents } from "nanoevents";

import {
  WebDFUSettings,
  WebDFUEvent,
  WebDFUOptions,
  WebDFUProperties,
  WebDFUType,
  WebDFULog,
  WebDFUInterfaceSubDescriptor,
  WebDFUInterfaceDescriptor,
  parseMemoryDescriptor,
  DFUseMemorySegment,
  DFUseCommands,
  parseConfigurationDescriptor,
  WebDFUError,
} from "./core";
import {
  WebDFUProcessErase,
  WebDFUProcessRead,
  WebDFUProcessWrite,
} from "./process";

export * from "./core";

export const dfuCommands = {
  DETACH: 0x00,
  DOWNLOAD: 0x01,
  UPLOAD: 0x02,
  GETSTATUS: 0x03,
  CLRSTATUS: 0x04,
  GETSTATE: 0x05,
  ABORT: 0x06,

  appIDLE: 0,
  appDETACH: 1,

  dfuIDLE: 2,
  dfuDOWNLOAD_SYNC: 3,
  dfuDNBUSY: 4,
  dfuDOWNLOAD_IDLE: 5,
  dfuMANIFEST_SYNC: 6,
  dfuMANIFEST: 7,
  dfuMANIFEST_WAIT_RESET: 8,
  dfuUPLOAD_IDLE: 9,
  dfuERROR: 10,

  STATUS_OK: 0x0,
  STATUS_errVENDOR: 0x0b,
};

function asyncSleep(duration_ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, duration_ms);
  });
}

export class WebDFU {
  events = createNanoEvents<WebDFUEvent>();

  interfaces: WebDFUSettings[] = [];

  properties?: WebDFUProperties;

  connected = false;

  dfuseStartAddress = NaN;

  dfuseMemoryInfo?: { name: string; segments: DFUseMemorySegment[] };

  currentInterfaceSettings?: WebDFUSettings;

  constructor(
    public readonly device: USBDevice,
    public readonly settings: WebDFUOptions,
    private readonly log: WebDFULog
  ) {}

  get type(): number {
    if (
      this.properties?.DFUVersion === 0x011a &&
      this.currentInterfaceSettings?.alternate.interfaceProtocol === 0x02
    ) {
      return WebDFUType.SDFUse;
    }

    return WebDFUType.DFU;
  }

  async init(): Promise<void> {
    this.interfaces = await this.findDfuInterfaces();
    this.events.emit("init");
  }

  async connect(interfaceIndex: number): Promise<void> {
    if (!this.device.opened) {
      await this.device.open();
    }

    // Attempt to parse the DFU functional descriptor
    let desc: WebDFUProperties | null = null;
    try {
      desc = await this.getDFUDescriptorProperties();
    } catch (error) {
      this.events.emit("disconnect", error);
      throw error;
    }

    const intrf = this.interfaces[interfaceIndex];

    if (!intrf) {
      throw new WebDFUError("Interface not found");
    }

    this.currentInterfaceSettings = intrf;
    if (this.currentInterfaceSettings.name) {
      this.dfuseMemoryInfo = parseMemoryDescriptor(
        this.currentInterfaceSettings.name
      );
    }

    if (desc) {
      this.properties = desc;
    }

    try {
      await this.open();
    } catch (error) {
      this.events.emit("disconnect", error);
      throw error;
    }

    this.events.emit("connect");
  }

  async close() {
    await this.device.close();
    this.events.emit("disconnect");
  }

  read(xferSize: number, maxSize: number): WebDFUProcessRead {
    const process = new WebDFUProcessRead();

    try {
      let blob: Promise<Blob>;
      if (this.type === WebDFUType.SDFUse) {
        blob = this.doDfuseRead(process, xferSize, maxSize);
      } else {
        blob = this.doRead(process, xferSize, maxSize);
      }

      blob
        .then((data) => process.events.emit("end", data))
        .catch((error) => process.events.emit("error", error));
    } catch (error) {
      process.events.emit("error", error);
    }

    return process;
  }

  write(
    xfer_size: number,
    data: ArrayBuffer,
    manifestationTolerant: boolean
  ): WebDFUProcessWrite {
    const process = new WebDFUProcessWrite();

    setTimeout(() => {
      try {
        let result: Promise<void>;

        if (this.type === WebDFUType.SDFUse) {
          result = this.doDfuseWrite(process, xfer_size, data);
        } else {
          result = this.doWrite(
            process,
            xfer_size,
            data,
            manifestationTolerant
          );
        }

        result
          .then(() => process.events.emit("end"))
          .catch((error: Error) => process.events.emit("error", error));
      } catch (error) {
        process.events.emit("error", error as Error);
      }
    }, 0);

    return process;
  }

  async forceUnprotect(): Promise<void> {
    await this.dfuseCommand(DFUseCommands.READ_UNPROTECT);
    await this.detach().catch(() => {});
    await this.device.reset().catch(() => {});
    await this.device.close().catch(() => {});
  }

  // Attempt to read the DFU functional descriptor
  // TODO: read the selected configuration's descriptor
  private async getDFUDescriptorProperties(): Promise<WebDFUProperties | null> {
    const data = await this.readConfigurationDescriptor(0);

    const configDesc = parseConfigurationDescriptor(data);
    let funcDesc: WebDFUInterfaceSubDescriptor | null = null;
    const configValue = this.device.configuration?.configurationValue;
    if (configDesc.bConfigurationValue === configValue) {
      for (const desc of configDesc.descriptors) {
        if (
          desc.bDescriptorType === 0x21 &&
          Object.prototype.hasOwnProperty.call(desc, "bcdDFUVersion")
        ) {
          funcDesc = desc as WebDFUInterfaceSubDescriptor;
          break;
        }
      }
    }

    if (!funcDesc) {
      return null;
    }

    return {
      WillDetach: (funcDesc.bmAttributes & 0x08) !== 0,
      ManifestationTolerant: (funcDesc.bmAttributes & 0x04) !== 0,
      CanUpload: (funcDesc.bmAttributes & 0x02) !== 0,
      CanDownload: (funcDesc.bmAttributes & 0x01) !== 0,
      TransferSize: funcDesc.wTransferSize,
      DetachTimeOut: funcDesc.wDetachTimeOut,
      DFUVersion: funcDesc.bcdDFUVersion,
    };
  }

  private async findDfuInterfaces(): Promise<WebDFUSettings[]> {
    const interfaces = [];

    for (const conf of this.device.configurations) {
      for (const intf of conf.interfaces) {
        for (const alt of intf.alternates) {
          if (
            alt.interfaceClass === 0xfe &&
            alt.interfaceSubclass === 0x01 &&
            (alt.interfaceProtocol === 0x01 || alt.interfaceProtocol === 0x02)
          ) {
            interfaces.push({
              configuration: conf,
              interface: intf,
              alternate: alt,
              name: alt.interfaceName,
            });
          }
        }
      }
    }

    if (this.settings.forceInterfacesName) {
      // Need force
      await this.fixInterfaceNames(interfaces);
    }

    return interfaces;
  }

  private async fixInterfaceNames(interfaces: WebDFUSettings[]) {
    // Check if any interface names were not read correctly
    if (interfaces.some((intf) => intf.name == null)) {
      await this.device.open();
      await this.device.selectConfiguration(1);

      const mapping = await this.readInterfaceNames();

      for (const intf of interfaces) {
        if (intf.name == null) {
          const configIndex = intf.configuration.configurationValue;
          const intfNumber = intf.interface.interfaceNumber;
          const alt = intf.alternate.alternateSetting;
          intf.name = mapping[configIndex]?.[intfNumber]?.[alt]?.toString();
        }
      }
    }
  }

  private async readStringDescriptor(index: number, langID = 0) {
    const GET_DESCRIPTOR = 0x06;
    const DT_STRING = 0x03;
    const wValue = (DT_STRING << 8) | index;

    const requestSetup: USBControlTransferParameters = {
      requestType: "standard",
      recipient: "device",
      request: GET_DESCRIPTOR,
      value: wValue,
      index: langID,
    };

    // Read enough for bLength
    let result = await this.device.controlTransferIn(requestSetup, 1);

    if (result.data && result.status === "ok") {
      // Retrieve the full descriptor
      const bLength = result.data.getUint8(0);
      result = await this.device.controlTransferIn(requestSetup, bLength);
      if (result.data && result.status === "ok") {
        const len = (bLength - 2) / 2;
        const u16Words = [];
        for (let i = 0; i < len; i += 1) {
          u16Words.push(result.data.getUint16(2 + i * 2, true));
        }
        if (langID === 0) {
          // Return the langID array
          return u16Words;
        }
        // Decode from UCS-2 into a string
        return String.fromCharCode(...u16Words);
      }
    }

    throw new WebDFUError(
      `Failed to read string descriptor ${index}: ${result.status}`
    );
  }

  private async readDeviceDescriptor(): Promise<DataView> {
    const GET_DESCRIPTOR = 0x06;
    const DT_DEVICE = 0x01;
    const wValue = DT_DEVICE << 8;

    const result = await this.device.controlTransferIn(
      {
        requestType: "standard",
        recipient: "device",
        request: GET_DESCRIPTOR,
        value: wValue,
        index: 0,
      },
      18
    );

    if (!result.data || result.status !== "ok") {
      throw new WebDFUError(
        `Failed to read device descriptor: ${result.status}`
      );
    }

    return result.data;
  }

  private async readInterfaceNames() {
    const DT_INTERFACE = 4;

    const configs: Record<
      number,
      Record<number, Record<number, number | string>>
    > = {};
    const allStringIndices = new Set<number>();
    for (
      let configIndex = 0;
      configIndex < this.device.configurations.length;
      configIndex += 1
    ) {
      // eslint-disable-next-line no-await-in-loop
      const rawConfig = await this.readConfigurationDescriptor(configIndex);
      const configDesc = parseConfigurationDescriptor(rawConfig);
      const configValue = configDesc.bConfigurationValue;
      configs[configValue] = {};

      // Retrieve string indices for interface names
      for (let desc of configDesc.descriptors) {
        if (desc.bDescriptorType === DT_INTERFACE) {
          desc = desc as WebDFUInterfaceDescriptor;

          if (!configs[configValue]?.[desc.bInterfaceNumber]) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            configs[configValue]![desc.bInterfaceNumber] = {};
          }

          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          configs[configValue]![desc.bInterfaceNumber]![
            desc.bAlternateSetting
          ] = desc.iInterface;

          if (desc.iInterface > 0) {
            allStringIndices.add(desc.iInterface);
          }
        }
      }
    }

    const strings: Record<number | string, string | number[] | null> = {};

    // Retrieve interface name strings
    for (const index of allStringIndices) {
      try {
        // eslint-disable-next-line no-await-in-loop
        strings[index] = await this.readStringDescriptor(index, 0x0409);
      } catch (error) {
        console.log(error);
        strings[index] = null;
      }
    }

    for (const config of Object.values(configs)) {
      for (const intf of Object.values(config)) {
        for (const alt in intf) {
          if (Object.prototype.hasOwnProperty.call(intf, alt)) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            intf[alt] = strings[intf[alt]!] as string;
          }
        }
      }
    }

    return configs;
  }

  private async readConfigurationDescriptor(index: number): Promise<DataView> {
    const GET_DESCRIPTOR = 0x06;
    const DT_CONFIGURATION = 0x02;
    const wValue = (DT_CONFIGURATION << 8) | index;

    const setup: USBControlTransferParameters = {
      requestType: "standard",
      recipient: "device",
      request: GET_DESCRIPTOR,
      value: wValue,
      index: 0,
    };

    const descriptorSize = await this.device.controlTransferIn(setup, 4);

    if (!descriptorSize.data || descriptorSize.status !== "ok") {
      throw new WebDFUError(
        `controlTransferIn error. [status]: ${descriptorSize.status}`
      );
    }

    // Read out length of the configuration descriptor
    const wLength = descriptorSize.data.getUint16(2, true);

    const descriptor = await this.device.controlTransferIn(setup, wLength);

    if (!descriptor.data || descriptor.status !== "ok") {
      throw new WebDFUError(
        `controlTransferIn error. [status]: ${descriptor.status}`
      );
    }

    return descriptor.data;
  }

  // Control
  async open() {
    if (!this.currentInterfaceSettings) {
      throw new WebDFUError("Required selected interface");
    }

    const confValue =
      this.currentInterfaceSettings.configuration.configurationValue;

    if (
      !this.device.configuration ||
      this.device.configuration.configurationValue !== confValue
    ) {
      await this.device.selectConfiguration(confValue);
    }

    if (!this.device.configuration) {
      throw new WebDFUError(`Couldn't select the configuration '${confValue}'`);
    }

    const intfNumber = this.currentInterfaceSettings.interface.interfaceNumber;
    if (!this.device.configuration.interfaces[intfNumber]?.claimed) {
      await this.device.claimInterface(intfNumber);
    }

    const altSetting = this.currentInterfaceSettings.alternate.alternateSetting;
    const intf = this.device.configuration.interfaces[intfNumber];
    if (!intf?.alternate || intf.alternate.alternateSetting !== altSetting) {
      await this.device.selectAlternateInterface(intfNumber, altSetting);
    }
  }

  detach() {
    return this.requestOut(dfuCommands.DETACH, undefined, 1000);
  }

  abort() {
    return this.requestOut(dfuCommands.ABORT);
  }

  // Status
  async isError() {
    try {
      const state = await this.getStatus();

      return state.state === dfuCommands.dfuERROR;
    } catch (_) {
      return true;
    }
  }

  getState() {
    return this.requestIn(dfuCommands.GETSTATE, 1).then(
      (data) => Promise.resolve(data.getUint8(0)),
      (error) => Promise.reject(new Error(`DFU GETSTATE failed: ${error}`))
    );
  }

  getStatus() {
    return this.requestIn(dfuCommands.GETSTATUS, 6).then(
      (data) =>
        Promise.resolve({
          status: data.getUint8(0),
          pollTimeout: data.getUint32(1, true) & 0xffffff,
          state: data.getUint8(4),
        }),
      (error) => Promise.reject(new Error(`DFU GETSTATUS failed: ${error}`))
    );
  }

  clearStatus() {
    return this.requestOut(dfuCommands.CLRSTATUS);
  }

  /* Driver options */
  private get intfNumber(): number {
    if (!this.currentInterfaceSettings) {
      throw new WebDFUError("Required selected interface");
    }

    return this.currentInterfaceSettings.interface.interfaceNumber;
  }

  private async requestOut(
    bRequest: number,
    data?: BufferSource,
    wValue = 0
  ): Promise<number> {
    try {
      const result = await this.device.controlTransferOut(
        {
          requestType: "class",
          recipient: "interface",
          request: bRequest,
          value: wValue,
          index: this.intfNumber,
        },
        data
      );

      if (result.status !== "ok") {
        throw new WebDFUError(result.status);
      }

      return result.bytesWritten;
    } catch (error) {
      throw new WebDFUError(`ControlTransferOut failed: ${error}`);
    }
  }

  private async requestIn(
    bRequest: number,
    wLength: number,
    wValue = 0
  ): Promise<DataView> {
    try {
      const result = await this.device.controlTransferIn(
        {
          requestType: "class",
          recipient: "interface",
          request: bRequest,
          value: wValue,
          index: this.intfNumber,
        },
        wLength
      );

      if (result.status !== "ok" || !result.data) {
        throw new WebDFUError(result.status);
      }

      return result.data;
    } catch (error) {
      throw new WebDFUError(`ControlTransferIn failed: ${error}`);
    }
  }

  private download(data: ArrayBuffer, blockNum: number) {
    return this.requestOut(dfuCommands.DOWNLOAD, data, blockNum);
  }

  private upload(length: number, blockNum: number) {
    return this.requestIn(dfuCommands.UPLOAD, length, blockNum);
  }

  // IDLE
  private async abortToIdle() {
    await this.abort();
    let state = await this.getState();
    if (state === dfuCommands.dfuERROR) {
      await this.clearStatus();
      state = await this.getState();
    }
    if (state !== dfuCommands.dfuIDLE) {
      throw new WebDFUError(
        `Failed to return to idle state after abort: state ${state}`
      );
    }
  }

  private async pollUntil(
    statePredicate: (state: number) => boolean,
    ignoreErrors = false
  ) {
    let dfuStatus = await this.getStatus();

    while (
      !statePredicate(dfuStatus.state) &&
      (ignoreErrors || dfuStatus.state !== dfuCommands.dfuERROR)
    ) {
      // eslint-disable-next-line no-await-in-loop
      await asyncSleep(0);
      try {
        // eslint-disable-next-line no-await-in-loop
        dfuStatus = await this.getStatus();
        // eslint-disable-next-line no-empty
      } catch (error) {}
    }

    return dfuStatus;
  }

  private pollUntilIdle(idle_state: number) {
    return this.pollUntil((state: number) => state === idle_state);
  }

  private async doRead(
    process: WebDFUProcessRead,
    xfer_size: number,
    max_size = Infinity,
    first_block = 0
  ): Promise<Blob> {
    let transaction = first_block;
    const blocks = [];
    let bytesRead = 0;

    // Initialize progress to 0
    process.events.emit("process", 0);

    let result;
    let bytesToRead;
    do {
      bytesToRead = Math.min(xfer_size, max_size - bytesRead);
      // eslint-disable-next-line no-await-in-loop
      result = await this.upload(bytesToRead, transaction);
      transaction += 1;
      if (result.byteLength > 0) {
        blocks.push(result);
        bytesRead += result.byteLength;
      }

      process.events.emit(
        "process",
        bytesRead,
        Number.isFinite(max_size) ? max_size : undefined
      );
    } while (bytesRead < max_size && result.byteLength === bytesToRead);

    if (bytesRead === max_size) {
      await this.abortToIdle();
    }

    return new Blob(blocks, { type: "application/octet-stream" });
  }

  private async doWrite(
    process: WebDFUProcessWrite,
    xfer_size: number,
    data: ArrayBuffer,
    manifestationTolerant = true
  ): Promise<void> {
    let bytesSent = 0;
    const expectedSize = data.byteLength;
    let transaction = 0;

    process.events.emit("write/start");

    // Initialize progress to 0
    process.events.emit("write/process", bytesSent, expectedSize);

    while (bytesSent < expectedSize) {
      const bytesLeft = expectedSize - bytesSent;
      const chunkSize = Math.min(bytesLeft, xfer_size);

      let bytesWritten = 0;
      let dfuStatus;
      try {
        // eslint-disable-next-line no-await-in-loop
        bytesWritten = await this.download(
          data.slice(bytesSent, bytesSent + chunkSize),
          transaction
        );
        transaction += 1;
        // eslint-disable-next-line no-await-in-loop
        dfuStatus = await this.pollUntilIdle(dfuCommands.dfuDOWNLOAD_IDLE);
      } catch (error) {
        throw new WebDFUError(`Error during DFU download: ${error}`);
      }

      if (dfuStatus.status !== dfuCommands.STATUS_OK) {
        throw new WebDFUError(
          `DFU DOWNLOAD failed state=${dfuStatus.state}, status=${dfuStatus.status}`
        );
      }

      bytesSent += bytesWritten;

      process.events.emit("write/process", bytesSent, expectedSize);
    }

    try {
      await this.download(new ArrayBuffer(0), transaction);
      transaction += 1;
    } catch (error) {
      throw new WebDFUError(`Error during final DFU download: ${error}`);
    }

    process.events.emit("write/end", bytesSent);

    if (manifestationTolerant) {
      // Transition to MANIFEST_SYNC state
      let dfuStatus;
      try {
        // Wait until it returns to idle.
        // If it's not really manifestation tolerant, it might transition to MANIFEST_WAIT_RESET
        dfuStatus = await this.pollUntil(
          (state) =>
            state === dfuCommands.dfuIDLE ||
            state === dfuCommands.dfuMANIFEST_WAIT_RESET
        );

        // if dfu_status.state === dfuCommands.dfuMANIFEST_WAIT_RESET
        // => Device transitioned to MANIFEST_WAIT_RESET even though it is manifestation tolerant

        if (dfuStatus.status !== dfuCommands.STATUS_OK) {
          throw new WebDFUError(
            `DFU MANIFEST failed state=${dfuStatus.state}, status=${dfuStatus.status}`
          );
        }
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message.endsWith(
            "ControlTransferIn failed: NotFoundError: Device unavailable."
          ) ||
            error.message.endsWith(
              "ControlTransferIn failed: NotFoundError: The device was disconnected."
            ))
        ) {
          this.log.warning("Unable to poll final manifestation status");
        } else {
          throw new WebDFUError(`Error during DFU manifest: ${error}`);
        }
      }
    } else {
      // Try polling once to initiate manifestation
      try {
        await this.getStatus();
        // eslint-disable-next-line no-empty
      } catch (error) {}
    }

    // Reset to exit MANIFEST_WAIT_RESET
    try {
      await this.device.reset();
    } catch (error) {
      if (
        error === "NetworkError: Unable to reset the device." ||
        error === "NotFoundError: Device unavailable." ||
        error === "NotFoundError: The device was disconnected."
      ) {
        // Ignored reset error
      } else {
        throw new WebDFUError(`Error during reset for manifestation: ${error}`);
      }
    }
  }

  // DFUse specific
  private async doDfuseWrite(
    process: WebDFUProcessWrite,
    xfer_size: number,
    data: ArrayBuffer
  ) {
    if (!this.dfuseMemoryInfo || this.dfuseMemoryInfo.segments.length < 1) {
      throw new WebDFUError("No memory map available");
    }

    process.events.emit("erase/start");

    let bytesSent = 0;
    const expectedSize = data.byteLength;

    let startAddress: number | undefined = this.dfuseStartAddress;

    if (Number.isNaN(startAddress)) {
      startAddress = this.dfuseMemoryInfo.segments[0]?.start;

      if (!startAddress) {
        throw new WebDFUError("startAddress not found");
      }

      this.log.warning(
        `Using inferred start address 0x${startAddress.toString(16)}`
      );
    } else if (
      this.getDfuseSegment(startAddress) === null &&
      data.byteLength !== 0
    ) {
      throw new WebDFUError(
        `Start address 0x${startAddress.toString(
          16
        )} outside of memory map bounds`
      );
    }

    await new Promise<void>((resolve, reject) => {
      if (!startAddress) {
        reject(new WebDFUError("startAddress not found"));
        return;
      }

      const ev = this.erase(startAddress, expectedSize);

      ev.events.on("process", (...args) =>
        process.events.emit("erase/process", ...args)
      );
      ev.events.on("error", reject);
      ev.events.on("end", () => {
        process.events.emit("erase/end");
        resolve();
      });
    });

    process.events.emit("write/start");

    let address = startAddress;
    while (bytesSent < expectedSize) {
      const bytesLeft = expectedSize - bytesSent;
      const chunkSize = Math.min(bytesLeft, xfer_size);

      let bytesWritten = 0;
      let dfuStatus;
      try {
        // eslint-disable-next-line no-await-in-loop
        await this.dfuseCommand(DFUseCommands.SET_ADDRESS, address, 4);
        // eslint-disable-next-line no-await-in-loop
        bytesWritten = await this.download(
          data.slice(bytesSent, bytesSent + chunkSize),
          2
        );
        // eslint-disable-next-line no-await-in-loop
        dfuStatus = await this.pollUntilIdle(dfuCommands.dfuDOWNLOAD_IDLE);
        address += chunkSize;
      } catch (error) {
        throw new WebDFUError(`Error during DfuSe download: ${error}`);
      }

      if (dfuStatus.status !== dfuCommands.STATUS_OK) {
        throw new WebDFUError(
          `DFU DOWNLOAD failed state=${dfuStatus.state}, status=${dfuStatus.status}`
        );
      }

      bytesSent += bytesWritten;

      process.events.emit("write/process", bytesSent, expectedSize);
    }

    process.events.emit("write/end", bytesSent);

    try {
      await this.dfuseCommand(DFUseCommands.SET_ADDRESS, startAddress, 4);
      await this.download(new ArrayBuffer(0), 0);
    } catch (error) {
      throw new WebDFUError(`Error during DfuSe manifestation: ${error}`);
    }

    await this.pollUntil((state) => state === dfuCommands.dfuMANIFEST);
  }

  private async doDfuseRead(
    process: WebDFUProcessRead,
    xfer_size: number,
    max_size = Infinity
  ) {
    if (!this.dfuseMemoryInfo) {
      throw new WebDFUError("Unknown a DfuSe memory info");
    }

    let startAddress: number | undefined = this.dfuseStartAddress;
    if (Number.isNaN(startAddress)) {
      startAddress = this.dfuseMemoryInfo.segments[0]?.start;
      if (!startAddress) {
        throw new WebDFUError("Unknown memory segments");
      }
      this.log.warning(
        `Using inferred start address 0x${startAddress.toString(16)}`
      );
    } else if (this.getDfuseSegment(startAddress) === null) {
      this.log.warning(
        `Start address 0x${startAddress.toString(
          16
        )} outside of memory map bounds`
      );
    }

    const state = await this.getState();
    if (state !== dfuCommands.dfuIDLE) {
      await this.abortToIdle();
    }
    await this.dfuseCommand(DFUseCommands.SET_ADDRESS, startAddress, 4);
    await this.abortToIdle();

    // DfuSe encodes the read address based on the transfer size,
    // the block number - 2, and the SET_ADDRESS pointer.
    return this.doRead(process, xfer_size, max_size, 2);
  }

  getDfuseSegment(addr: number): DFUseMemorySegment | null {
    if (!this.dfuseMemoryInfo || this.dfuseMemoryInfo.segments.length < 1) {
      throw new WebDFUError("No memory map information available");
    }

    for (const segment of this.dfuseMemoryInfo.segments) {
      if (segment.start <= addr && addr < segment.end) {
        return segment;
      }
    }

    return null;
  }

  getDfuseFirstWritableSegment() {
    if (!this.dfuseMemoryInfo || this.dfuseMemoryInfo.segments.length < 1) {
      throw new WebDFUError("No memory map information available");
    }

    for (const segment of this.dfuseMemoryInfo.segments) {
      if (segment.writable) {
        return segment;
      }
    }

    return null;
  }

  getDfuseMaxReadSize(startAddr: number) {
    if (!this.dfuseMemoryInfo || this.dfuseMemoryInfo.segments.length < 1) {
      throw new WebDFUError("No memory map information available");
    }

    let numBytes = 0;
    for (const segment of this.dfuseMemoryInfo.segments) {
      if (segment.start <= startAddr && startAddr < segment.end) {
        // Found the first segment the read starts in
        if (segment.readable) {
          numBytes += segment.end - startAddr;
        } else {
          return 0;
        }
      } else if (segment.start === startAddr + numBytes) {
        // Include a contiguous segment
        if (segment.readable) {
          numBytes += segment.end - segment.start;
        } else {
          break;
        }
      }
    }

    return numBytes;
  }

  private getDfuseSectorStart(
    addr: number,
    segment = this.getDfuseSegment(addr)
  ) {
    if (!segment) {
      throw new WebDFUError(
        `Address ${addr.toString(16)} outside of memory map`
      );
    }

    const sectorIndex = Math.floor((addr - segment.start) / segment.sectorSize);
    return segment.start + sectorIndex * segment.sectorSize;
  }

  private getDfuseSectorEnd(
    addr: number,
    segment = this.getDfuseSegment(addr)
  ) {
    if (!segment) {
      throw new WebDFUError(
        `Address ${addr.toString(16)} outside of memory map`
      );
    }

    const sectorIndex = Math.floor((addr - segment.start) / segment.sectorSize);
    return segment.start + (sectorIndex + 1) * segment.sectorSize;
  }

  private erase(startAddr: number, length: number): WebDFUProcessErase {
    const process = new WebDFUProcessErase();

    void (async () => {
      let segment = this.getDfuseSegment(startAddr);
      let addr = this.getDfuseSectorStart(startAddr, segment);
      const endAddr = this.getDfuseSectorEnd(startAddr + length - 1);

      if (!segment) {
        throw new WebDFUError("Unknown segment");
      }

      let bytesErased = 0;
      const bytesToErase = endAddr - addr;
      if (bytesToErase > 0) {
        process.events.emit("process", bytesErased, bytesToErase);
      }

      while (addr < endAddr) {
        if ((segment?.end ?? 0) <= addr) {
          segment = this.getDfuseSegment(addr);
        }

        if (!segment?.erasable) {
          // Skip over the non-erasable section
          bytesErased = Math.min(
            bytesErased + (segment?.end ?? 0) - addr,
            bytesToErase
          );
          addr = segment?.end ?? 0;
        } else {
          const sectorIndex = Math.floor(
            (addr - segment.start) / segment.sectorSize
          );
          const sectorAddr = segment.start + sectorIndex * segment.sectorSize;
          // eslint-disable-next-line no-await-in-loop
          await this.dfuseCommand(DFUseCommands.ERASE_SECTOR, sectorAddr, 4);
          addr = sectorAddr + segment.sectorSize;
          bytesErased += segment.sectorSize;
        }

        process.events.emit("process", bytesErased, bytesToErase);
      }
    })()
      .then(() => process.events.emit("end"))
      .catch((error: Error) => process.events.emit("error", error));

    return process;
  }

  private async dfuseCommand(command: DFUseCommands, param = 0x00, len = 0) {
    const payload = new ArrayBuffer(len + 1);
    const view = new DataView(payload);
    view.setUint8(0, command);
    if (len === 1) {
      view.setUint8(1, param);
    } else if (len === 4) {
      view.setUint32(1, param, true);
    } else if (len !== 0) {
      throw new WebDFUError(`Don't know how to handle data of len ${len}`);
    }

    try {
      await this.download(payload, 0);
    } catch (error) {
      throw new WebDFUError(
        `Error during special DfuSe command ${DFUseCommands[command]}:${error}`
      );
    }

    // We expect read unprotect to disconnect the device
    // so no point in waiting for it to complete
    if (command === DFUseCommands.READ_UNPROTECT) {
      const { pollTimeout } = await this.getStatus();
      await asyncSleep(pollTimeout);
      return;
    }

    const status = await this.pollUntil(
      (state) => state !== dfuCommands.dfuDNBUSY
    );

    if (status.status !== dfuCommands.STATUS_OK) {
      throw new WebDFUError(`Special DfuSe command ${command} failed`);
    }
  }
}
