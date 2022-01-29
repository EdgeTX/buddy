const hasUsbApi = !!(
  (!!navigator.usb as boolean) && navigator.usb.requestDevice
);

const hasFilesystemApi =
  (!!window.showDirectoryPicker as boolean) &&
  (!!window.showSaveFilePicker as boolean);

export default { hasFilesystemApi, hasUsbApi } as const;
