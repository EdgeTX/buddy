// eslint-disable-next-line import/no-extraneous-dependencies
import { ipcRenderer } from "electron";
import { WINDOW_CLOSE, WINDOW_MINIMIZE } from "./windowControls";

window.ipcRenderer = ipcRenderer;
window.electronMinimize = () => ipcRenderer.send(WINDOW_MINIMIZE);
window.electronClose = () => ipcRenderer.send(WINDOW_CLOSE);
