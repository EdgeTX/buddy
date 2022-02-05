import fs from "fs";
import path from "path";
import os from "os";

export const pathExists = (filePath: string) => {
  try {
    fs.accessSync(filePath);
    return true;
  } catch (_) {
    return false;
  }
};

export const binaryPath = () => {
  switch (os.platform()) {
    case "linux":
      return path.join(__dirname, "../../dist/linux-unpacked/edgetx-buddy");
    case "darwin":
      return path.join(
        __dirname,
        "../../dist/mac/EdgeTX Buddy.app/Contents/MacOS/EdgeTX Buddy"
      );
    case "win32":
      return path.join(__dirname, "../../dist/win-unpacked/EdgeTX Buddy.exe");
    default:
      throw new Error("Unknown OS");
  }
};

export const electronMain = path.join(__dirname, "../../build/main.js");
