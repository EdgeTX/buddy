// eslint-disable-next-line import/no-extraneous-dependencies
import { ipcRenderer } from "electron";

window.ipcRenderer = ipcRenderer;

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    ipcRenderer?: typeof ipcRenderer;
  }
}
