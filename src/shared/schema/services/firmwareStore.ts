import ky from "ky-universal";
import md5 from "md5";
import { unzipRaw, Reader, ZipInfoRaw } from "unzipit";
import axios from "axios";

class HTTPRangeReader implements Reader {
  private url: string;
  private length?: number;

  constructor(url: string) {
    this.url = url;
  }

  async getLength() {
    if (this.length === undefined) {
      try {
        const req = await axios(this.url, { method: "HEAD" });

        this.length = parseInt(req.headers["content-length"]);
        if (Number.isNaN(this.length)) {
          throw Error("could not get length");
        }
      } catch (e) {
        if (axios.isAxiosError(e)) {
          throw new Error(
            `failed http request ${this.url}, status: ${e.response?.status}: ${e.response?.statusText}`
          );
        }
        throw e;
      }
    }
    return this.length;
  }

  async read(offset: number, size: number) {
    if (size === 0) {
      return new Uint8Array(0);
    }
    try {
      const req = await axios.get(this.url, {
        headers: {
          Range: `bytes=${offset}-${offset + size - 1}`,
        },
        responseType: "arraybuffer",
      });

      const buffer = (await req.data) as ArrayBuffer;
      console.log("read", buffer.byteLength);
      return new Uint8Array(buffer);
    } catch (e) {
      if (axios.isAxiosError(e)) {
        throw new Error(
          `failed http request ${this.url}, status: ${e.response?.status} offset: ${offset} size: ${size}: ${e.response?.statusText}`
        );
      }

      throw e;
    }
  }
}

export type Target = {
  name: string;
  code: string;
};

type FirmwareFile = {
  targets: [string, string][];
};

const firmwareTargetsCache: Record<string, Promise<Target[]>> = {};

const firmwareBundle = (url: string): Promise<ZipInfoRaw> => {
  const reader = new HTTPRangeReader(
    // Whilst we wait for a solution to cors, there
    // will need to be some cors server in place
    `http://localhost:8080/${url}`
  );
  return unzipRaw(reader as Reader);
};

export const firmwareTargets = async (
  firmwareBundleUrl: string
): Promise<Target[]> => {
  if (!firmwareTargetsCache[firmwareBundleUrl]) {
    firmwareTargetsCache[firmwareBundleUrl] = (async () => {
      const { entries } = await firmwareBundle(firmwareBundleUrl);
      const firmwareFile = entries.find((entry) =>
        entry.name.endsWith("fw.json")
      );

      if (!firmwareFile) {
        delete firmwareTargetsCache[firmwareBundleUrl];
        throw new Error("Could not find firmware metadata file");
      }

      const data = (await firmwareFile.json()) as FirmwareFile;

      return data.targets.map(([name, code]) => ({
        name,
        code: code.slice(0, code.length - 1),
      }));
    })();
  }

  return firmwareTargetsCache[firmwareBundleUrl];
};

export const fetchFirmware = async (
  firmwareBundleUrl: string,
  target: string
): Promise<Buffer> => {
  const { entries } = await firmwareBundle(firmwareBundleUrl);
  const firmwareFile = entries.find((entry) => entry.name.startsWith(target));
  if (!firmwareFile) {
    throw new Error("Could not find firmware target binary");
  }

  return Buffer.from(await firmwareFile.arrayBuffer());
};

const maxNumFirmwares = 4;
const uploadedFirmware: { id: string; data: Buffer }[] = [];

export const registerFirmware = (firmwareBuffer: Buffer): string => {
  const hash = md5(firmwareBuffer);
  uploadedFirmware.push({ id: hash, data: firmwareBuffer });

  if (uploadedFirmware.length > maxNumFirmwares) {
    uploadedFirmware.shift();
  }
  return hash;
};

export const getLocalFirmwareById = (id: string): Buffer | undefined =>
  uploadedFirmware.find((firmware) => firmware.id === id)?.data;
