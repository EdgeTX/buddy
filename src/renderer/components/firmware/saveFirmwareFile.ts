import checks from "renderer/compatibility/checks";
import legacyDownload from "js-file-download";
import config from "shared/config";
import environment from "shared/environment";

const saveFirmwareFile = async (
  name: string,
  data: ArrayBufferLike,
  fileTypeDescription: string
): Promise<void> => {
  if (
    !checks.hasFilesystemApi ||
    environment.isElectron ||
    config.startParams.isE2e
  ) {
    legacyDownload(data, name, "application/octet-stream");
    return;
  }
  const fileExt = name.split(".").pop() ?? "";
  const fileHandle = await window.showSaveFilePicker({
    suggestedName: name,
    types: [
      {
        description: fileTypeDescription,
        accept: {
          "application/octet-stream": [`.${fileExt}`],
        },
      },
    ],
  });
  const writable = await fileHandle.createWritable();
  await writable.write(data);
  await writable.close();
};

export default saveFirmwareFile;
