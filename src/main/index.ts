import "source-map-support/register";
import "./polyfills";

// eslint-disable-next-line import/no-extraneous-dependencies
import electron, { BrowserWindow, app, dialog, ipcMain } from "electron";
import path from "path";
import WindowControls from "electron-window-controls";

import {
  createBusLinkBackend,
  createSchemaExecutor,
} from "apollo-bus-link/core";
import { electronBus } from "apollo-bus-link/electron";
import getOriginPrivateDirectory from "native-file-system-adapter/src/getOriginPrivateDirectory";
import nodeAdapter from "native-file-system-adapter/src/adapters/node";
import { WebUSB } from "usb";
import * as backend from "shared/backend";
import type { FileSystemApi, UsbApi } from "shared/backend";
import config from "shared/config";

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow: BrowserWindow | undefined;

const main = async (): Promise<void> => {
  // Quit when all windows are closed.
  app.on("window-all-closed", () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === undefined) {
      createWindow();
    }
  });

  await app.whenReady();

  startBackend();
  createWindow();
};

const createWindow = (): void => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    titleBarStyle: "hidden",
    resizable: !config.isProduction,
    show: false,
    webPreferences: {
      sandbox: !config.isE2e,
      allowRunningInsecureContent: false,
      // Need these enabled when e2e is running
      nodeIntegration: config.isE2e,
      enableRemoteModule: config.isE2e,
      contextIsolation: false,
      preload: `${__dirname}/preload.js`,
    } as electron.WebPreferences,
  });

  const searchQuery = ``;
  if (!config.isProduction) {
    console.log("loading renderer in development");
    void mainWindow.loadURL(`http://localhost:8081/index.html?next=true`);
  } else {
    console.log("loading renderer");
    void mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"), {
      search: searchQuery,
    });
  }

  // Emitted when the window is closed.
  mainWindow.on("closed", () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = undefined;
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void electron.shell.openExternal(details.url);
    return { action: "deny" };
  });

  mainWindow.once("ready-to-show", async () => {
    if (process.env.HEADLESS !== "true") {
      mainWindow?.show();
    }

    // Open the DevTools automatically if developing
    if (!config.isProduction && !config.isE2e) {
      const {
        default: installExtension,
        REACT_DEVELOPER_TOOLS,
        APOLLO_DEVELOPER_TOOLS,
        // eslint-disable-next-line import/no-extraneous-dependencies
      } = await import("electron-devtools-installer");
      installExtension(REACT_DEVELOPER_TOOLS).catch((err) =>
        // eslint-disable-next-line no-console
        console.log("Error loading React DevTools: ", err)
      );
      installExtension(APOLLO_DEVELOPER_TOOLS).catch((err) =>
        // eslint-disable-next-line no-console
        console.log("Error loading Apollo DevTools: ", err)
      );
      mainWindow?.webContents.openDevTools();
    }
  });

  WindowControls.initMain();
};

const startBackend = (): void => {
  const mocked = config.isMocked || config.isE2e;
  if (mocked) {
    console.log("Creating backend in mocked mode");
  }

  const busLink = createBusLinkBackend({
    registerBus: electronBus(ipcMain),
    executor: createSchemaExecutor({
      schema: backend.schema,
      context: mocked
        ? backend.createMockContext({
            fileSystem: fileSystemApi(),
          })
        : backend.createContext({
            fileSystem: fileSystemApi(),
            usb: usbApi(),
          }),
    }),
  });

  busLink.listen();
};

// Temporary fix broken high-dpi scale factor on Windows (125% scaling)
// info: https://github.com/electron/electron/issues/9691
if (process.platform === "win32") {
  app.commandLine.appendSwitch("high-dpi-support", "true");
  app.commandLine.appendSwitch("force-device-scale-factor", "1");
}

const usbApi = (): UsbApi => {
  // Some operations can take longer for stem boards
  const usb = new WebUSB({
    deviceTimeout: 60000,
    allowAllDevices: true,
  });

  return {
    requestDevice: usb.requestDevice.bind(usb),
    deviceList: async () => usb.getDevices(),
  };
};

const fileSystemApi = (): FileSystemApi => ({
  requestWritableDirectory: async () => {
    if (mainWindow) {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ["openDirectory"],
      });

      const filePath = result.filePaths[0];
      if (!filePath) {
        throw new Error("Directory was not selected");
      }

      const handler = await getOriginPrivateDirectory(nodeAdapter, filePath);

      // @ts-expect-error this is allowed because for some reason the name isn't being included in
      // the node adapter
      handler.name = filePath;
      return handler;
    }
    // Should never be called
    throw new Error("Main window was not available");
  },
});

void main();
