import { DownloadOutlined } from "@ant-design/icons";
import { gql, useApolloClient } from "@apollo/client";
import { Button, message } from "antd";
import React, { useState } from "react";
import { decodePrVersion, isPrVersion } from "shared/tools";
import * as base64ArrayBuffer from "base64-arraybuffer";
import { ButtonSize, ButtonType } from "antd/lib/button";
import checks from "renderer/compatibility/checks";
import legacyDownload from "js-file-download";
import config from "shared/config";
import { useTranslation } from "react-i18next";
import environment from "shared/environment";
import isUF2Payload from "shared/uf2/uf2";

type Props = {
  target?: string;
  version?: string;
  children: string;
  type?: ButtonType;
  size?: ButtonSize;
};

const DownloadFirmwareButton: React.FC<Props> = ({
  target,
  version,
  children,
  type,
  size,
}) => {
  const { t } = useTranslation("flashing");
  const [downloading, setDownloading] = useState(false);
  const isPr = isPrVersion(version ?? "");
  const isLocal = version === "local";
  const { prId, commitId } = decodePrVersion(version ?? "");
  const validPrVersion = isPr && prId && commitId && target;

  const client = useApolloClient();

  const promptAndDownload = async (
    name: string,
    data: ArrayBufferLike
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
          description: t(`Firmware data`),
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

  const download = async (): Promise<void> => {
    if (validPrVersion) {
      const response = await client.query({
        query: gql(/* GraphQL */ `
          query PrBuildFirmwareData($prId: ID!, $commitId: ID!, $target: ID!) {
            edgeTxPr(id: $prId) {
              id
              commit(id: $commitId) {
                id
                firmwareBundle {
                  id
                  target(code: $target) {
                    id
                    base64Data
                  }
                }
              }
            }
          }
        `),
        variables: {
          prId,
          commitId,
          target,
        },
      });

      const fileData =
        response.data.edgeTxPr?.commit?.firmwareBundle?.target?.base64Data;

      if (fileData) {
        const decodedData = base64ArrayBuffer.decode(fileData);
        const ext = isUF2Payload(decodedData) ? "uf2" : "bin";
        await promptAndDownload(
          `${target}-${commitId.slice(0, 7)}.${ext}`,
          decodedData
        );
      }
    } else if (!isLocal && target && version) {
      const response = await client.query({
        query: gql(/* GraphQL */ `
          query ReleaseFirmwareData($version: ID!, $target: ID!) {
            edgeTxRelease(id: $version) {
              id
              firmwareBundle {
                id
                target(code: $target) {
                  id
                  base64Data
                }
              }
            }
          }
        `),
        variables: {
          target,
          version,
        },
      });

      const fileData =
        response.data.edgeTxRelease?.firmwareBundle.target?.base64Data;

      if (fileData) {
        const decodedData = base64ArrayBuffer.decode(fileData);
        const ext = isUF2Payload(decodedData) ? "uf2" : "bin";
        await promptAndDownload(`${target}-${version}.${ext}`, decodedData);
      }
    }
  };

  return (
    <Button
      type={type}
      icon={<DownloadOutlined />}
      loading={downloading}
      disabled={!target || !version || isLocal}
      size={size}
      onClick={async () => {
        setDownloading(true);
        await download()
          .then(() => {
            void message.success(t(`Firmware file saved`));
          })
          .catch((e: Error) => {
            // ignore "Cancel"
            if (e.name === "AbortError") return;

            // TODO: open modal dialog to trigger full process
            //   -> fetch backend
            void message.error(
              t(`Could not download firmware: {{message}}`, {
                message: e.message,
              })
            );
          });
        setDownloading(false);
      }}
    >
      {children}
    </Button>
  );
};

export default DownloadFirmwareButton;
