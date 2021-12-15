export type FileSystemApi = {
  requestWritableDirectory: typeof window.showDirectoryPicker;
};

export type UsbApi = {
  requestDevice: typeof navigator.usb.requestDevice;
  deviceList: () => Promise<USBDevice[]>;
};
