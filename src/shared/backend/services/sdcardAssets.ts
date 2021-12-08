import ky, { DownloadProgress } from "ky-universal";
import { ZipEntry, unzipRaw } from "unzipit";
import config from "shared/config";

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
      if (!config.isElectron) {
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
