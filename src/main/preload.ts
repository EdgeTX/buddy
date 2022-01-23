// eslint-disable-next-line import/no-extraneous-dependencies
import { ipcRenderer } from "electron";
import { BrowserWindow } from "electron-window-controls";

window.ipcRenderer = ipcRenderer;
window.electronMinimize = () => BrowserWindow.minimize();
window.electronClose = () => BrowserWindow.close();
