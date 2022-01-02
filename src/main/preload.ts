// eslint-disable-next-line import/no-extraneous-dependencies
import { ipcRenderer } from "electron";
import { BrowserWindow } from "electron-window-controls";

window.ipcRenderer = ipcRenderer;
window.electronMinimize = () => BrowserWindow.minimize();
window.electronClose = () => BrowserWindow.close();

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    ipcRenderer?: typeof ipcRenderer;
    electronMinimize?: () => void;
    electronClose?: () => void;
  }
}
