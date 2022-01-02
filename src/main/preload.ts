// eslint-disable-next-line import/no-extraneous-dependencies
import electron, { ipcRenderer } from "electron";

const win = electron.BrowserWindow.getFocusedWindow();
window.ipcRenderer = ipcRenderer;
window.browserWindow = win;

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    ipcRenderer?: typeof ipcRenderer;
    browserWindow?: typeof win;
  }
}
