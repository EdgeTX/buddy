import ky, { DownloadProgress } from "ky-universal";
import { ZipEntry, unzipRaw } from "unzipit";
import config from "shared/backend/config";
import { uniqueBy } from "shared/tools";
import environment from "shared/environment";

type ManifestResponse = {
  targets: [string, string, string][];
};

const defaultManifestTargets = [
  { name: "Flysky NV14", asset: "nv14.zip", id: "nv14" },
  { name: "Jumper T16", asset: "horus.zip", id: "t16" },
  { name: "Jumper T18", asset: "horus.zip", id: "t18" },
  { name: "Jumper T-Lite", asset: "taranis-x7.zip", id: "tlite" },
  { name: "Jumper T-Pro", asset: "taranis-x7.zip", id: "tpro" },
  { name: "Jumper T12", asset: "taranis-x7.zip", id: "t12" },
  { name: "Frsky Horus X10", asset: "horus.zip", id: "x10" },
  { name: "Frsky Horus X10 Access", asset: "horus.zip", id: "x10-access" },
  { name: "Frsky Horus X12s", asset: "horus.zip", id: "x12s" },
  { name: "Frsky QX7", asset: "taranis-x7.zip", id: "x7" },
  { name: "Frsky QX7 Access", asset: "taranis-x7.zip", id: "x7-access" },
  { name: "Frsky X9D", asset: "taranis-x9.zip", id: "x9d" },
  { name: "Frsky X9D Plus", asset: "taranis-x9.zip", id: "x9dp" },
  { name: "Frsky X9D Plus 2019", asset: "taranis-x9.zip", id: "x9dp2019" },
  { name: "Frsky X-Lite", asset: "taranis-x7.zip", id: "xlite" },
  { name: "Frsky X-Lite S", asset: "taranis-x7.zip", id: "xlites" },
  { name: "Frsky X9 Lite", asset: "taranis-x7.zip", id: "x9lite" },
  { name: "Frsky X9 Lite S", asset: "taranis-x7.zip", id: "x9lites" },
  { name: "RadioMaster T8", asset: "taranis-x7.zip", id: "t8" },
  { name: "Radiomaster TX12", asset: "taranis-x7.zip", id: "tx12" },
  { name: "Radiomaster TX16s", asset: "horus.zip", id: "tx16s" },
  { name: "RadioMaster Zorro", asset: "taranis-x7.zip", id: "zorro" },
];

const targetManifestCache: Record<
  string,
  Promise<typeof defaultManifestTargets>
> = {};

export const fetchTargetsManifest = async (
  tag: string
): Promise<typeof defaultManifestTargets> => {
  if (!targetManifestCache[tag]) {
    targetManifestCache[tag] = (async () => {
      const url = `https://raw.githubusercontent.com/EdgeTX/edgetx-sdcard/${tag}/sdcard.json`;
      const res = await ky.get(url, { throwHttpErrors: false });
      if (res.status === 404) {
        return defaultManifestTargets;
      }

      if (res.status !== 200) {
        delete targetManifestCache[tag];
        throw new Error("Could not fetch sdcard targets manifest");
      }

      return uniqueBy(
        (await res.json<ManifestResponse>()).targets.map(
          ([name, id, asset]) => ({
            name,
            id: id.slice(0, id.length - 1),
            asset: `${asset}.zip`,
          })
        ),
        "id"
      );
    })();
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return targetManifestCache[tag]!;
};

export const downloadContents = async (
  assetUrls: string[],
  onProgress?: (progress: number) => void
): Promise<ZipEntry[]> => {
  const downloadProgressTrackers = assetUrls.map(() => ({
    totalBytes: 0,
    transferredBytes: 0,
  }));

  const onDownloadProgress = (
    key: number,
    progress: DownloadProgress
  ): void => {
    downloadProgressTrackers[key] = progress;
    if (
      downloadProgressTrackers.filter(({ totalBytes }) => totalBytes > 0)
        .length === assetUrls.length
    ) {
      const total = downloadProgressTrackers.reduce(
        (acc, tracker) => acc + tracker.totalBytes,
        0
      );
      const transferred = downloadProgressTrackers.reduce(
        (acc, tracker) => acc + tracker.transferredBytes,
        0
      );

      onProgress?.((transferred / total) * 100);
    }
  };

  const assets = await Promise.all(
    assetUrls.map(async (assetUrl, i) => {
      // In browser, we can use ky, as it uses fetch under the hood
      if (!environment.isMain) {
        return ky(assetUrl, {
          prefixUrl: config.proxyUrl,
          onDownloadProgress: (progress) => {
            onDownloadProgress(i, progress);
          },
        }).then((res) => res.blob());
      }

      // In node (electron), use got as it provides the progress
      const [{ default: got }, { default: getStream }] = await Promise.all([
        import("got"),
        import("get-stream"),
      ]);
      const stream = got.stream(assetUrl);
      stream.on("downloadProgress", () => {
        onDownloadProgress(i, {
          percent: stream.downloadProgress.percent,
          transferredBytes: stream.downloadProgress.transferred,
          totalBytes: stream.downloadProgress.total ?? 0,
        });
      });

      return new Blob([new Uint8Array(await getStream.buffer(stream)).buffer]);
    })
  );

  const unzippedAssets = await Promise.all(
    assets.map((asset) => unzipRaw(asset))
  );

  return unzippedAssets.reduce(
    (acc, { entries }) => acc.concat(entries),
    [] as ZipEntry[]
  );
};
