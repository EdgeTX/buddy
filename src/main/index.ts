import "source-map-support/register";
import "web-streams-polyfill/es2018";

// eslint-disable-next-line import/no-extraneous-dependencies
import electron, { app, dialog, BrowserWindow, ipcMain } from "electron";
import path from "path";
import url from "url";

import {
  createSchemaExecutor,
  createBusLinkBackend,
} from "apollo-bus-link/core";
import { electronBus } from "apollo-bus-link/electron";
import * as backend from "../shared/schema";
import getOriginPrivateDirectory from "native-file-system-adapter/src/getOriginPrivateDirectory";
import nodeAdapter from "native-file-system-adapter/src/adapters/node";
import { USB } from "webusb";
import { FileSystemApi, UsbApi } from "../shared/schema";

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow: BrowserWindow | undefined;

const usbApi = (): UsbApi => {
  let availableDevices: USBDevice[] = [];

  const usb = new USB({
    devicesFound: async (devices) => {
      availableDevices = devices;
      return undefined;
    },
  });

  return {
    requestDevice: usb.requestDevice.bind(usb),
    deviceList: async () => {
      await usb.requestDevice({ filters: [] });
      return availableDevices;
    },
  };
};

const fileSystemApi = (): FileSystemApi => {
  return {
    requestWritableFolder: async () => {
      if (mainWindow) {
        const result = await dialog.showOpenDialog(mainWindow, {
          properties: ["openDirectory"],
        });

        const path = result.filePaths[0];
        console.log(path);
        if (!path) {
          throw new Error("Directory was not selected");
        }

        return getOriginPrivateDirectory(nodeAdapter, path);
      } else {
        // Should never be called
        throw new Error("Main window was not available");
      }
    },
  };
};

const E2E = process.env.E2E === "true";
const PRODUCTION = process.env.NODE_ENV === "production";

const startBackend = (): void => {
  const mocked = process.env.MOCKED === "true" || E2E;
  if (mocked) {
    console.log("Creating backend in mocked mode");
  }

  const busLink = createBusLinkBackend({
    registerBus: electronBus(ipcMain),
    executor: createSchemaExecutor({
      schema: backend.schema,
      context: backend.createContext({
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

const createWindow = (): void => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    show: false,
    webPreferences: {
      sandbox: !E2E,
      allowRunningInsecureContent: false,
      // Need these enabled when e2e is running
      nodeIntegration: E2E,
      enableRemoteModule: E2E,
      contextIsolation: false,
      preload: `${__dirname}/preload.js`,
    } as electron.WebPreferences,
  });

  const searchQuery = ``;
  if (!PRODUCTION) {
    console.log("loading renderer in development");
    mainWindow.loadURL(
      url.format({
        protocol: "http:",
        host: "localhost:8080",
        pathname: "index.html",
        search: searchQuery,
        slashes: true,
      })
    );
  } else {
    console.log("loading renderer");
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"), {
      search: searchQuery,
    });
  }

  // Don't show until we react has fully loaded
  ipcMain.once("paint", async () => {
    if (process.env.HEADLESS !== "true") {
      mainWindow?.show();
    }

    // Open the DevTools automatically if developing
    if (!PRODUCTION && !E2E) {
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

  // Emitted when the window is closed.
  mainWindow.on("closed", () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = undefined;
  });
};

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

(async () => {
  await app.whenReady();
  startBackend();
  createWindow();
  mainWindow?.once("ready-to-show", () => {
    mainWindow?.show();
  });
})();
