export type FileSystemApi = {
  requestWritableFolder: typeof window.showDirectoryPicker;
};

export type UsbApi = {
  requestDevice: typeof navigator.usb.requestDevice;
  deviceList: () => Promise<USBDevice[]>;
};
