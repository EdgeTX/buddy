import { unzipRaw, HTTPRangeReader, Reader, ZipInfoRaw } from "unzipit";

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
