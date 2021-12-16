import md5 from "md5";
import { Reader, ZipInfoRaw, unzipRaw } from "unzipit";
import ZipHTTPRangeReader from "shared/backend/utils/ZipHTTPRangeReader";

export type Target = {
  name: string;
  code: string;
};

type FirmwareFile = {
  targets: [string, string][];
};

const firmwareTargetsCache: Record<string, Promise<Target[]>> = {};

const firmwareBundle = (url: string): Promise<ZipInfoRaw> => {
  const reader = new ZipHTTPRangeReader(url);
  return unzipRaw(reader as Reader);
};

export const firmwareTargets = async (
  firmwareBundleUrl: string
): Promise<Target[]> => {
  if (!firmwareTargetsCache[firmwareBundleUrl]) {
    firmwareTargetsCache[firmwareBundleUrl] = (async () => {
      try {
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
      } catch (e) {
        delete firmwareTargetsCache[firmwareBundleUrl];
        throw e;
      }
    })();
  }

  // We have to have just assigned this
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return firmwareTargetsCache[firmwareBundleUrl]!;
};

export const fetchFirmware = async (
  firmwareBundleUrl: string,
  target: string
): Promise<Buffer> => {
  const { entries } = await firmwareBundle(firmwareBundleUrl);
  const firmwareFile = entries.find(
    (entry) => entry.name.includes(`${target}-`) && entry.name.endsWith(".bin")
  );
  if (!firmwareFile) {
    throw new Error("Could not find firmware target binary");
  }

  return Buffer.from(await firmwareFile.arrayBuffer());
};

type LocalFirmware = { id: string; name?: string; data: Buffer };
const maxNumFirmwares = 4;
const uploadedFirmware: LocalFirmware[] = [];

export const registerFirmware = (
  firmwareBuffer: Buffer,
  name?: string
): string => {
  const hash = md5(firmwareBuffer);
  uploadedFirmware.push({ id: hash, name, data: firmwareBuffer });

  if (uploadedFirmware.length > maxNumFirmwares) {
    uploadedFirmware.shift();
  }
  return hash;
};

export const getLocalFirmwareById = (id: string): LocalFirmware | undefined =>
  uploadedFirmware.find((firmware) => firmware.id === id);
