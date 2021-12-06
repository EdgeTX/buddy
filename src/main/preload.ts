/* eslint-disable functional/prefer-type-literal */
// eslint-disable-next-line import/no-extraneous-dependencies
import { ipcRenderer } from "electron";

window.ipcRenderer = ipcRenderer;

declare global {
  interface Window {
    ipcRenderer?: typeof ipcRenderer;
  }
}
