export const hasUsbApi = !!(
  (!!navigator.usb as boolean) && navigator.usb.requestDevice
);
export const hasFilesystemApi =
  (!!window.showDirectoryPicker as boolean) &&
  (!!window.showSaveFilePicker as boolean);
