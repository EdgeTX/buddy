import { DownloadOutlined } from "@ant-design/icons";
import { useApolloClient } from "@apollo/client";
import gql from "gql";
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
import { SelectedFlags } from "shared/backend/types";

type Props = {
  target?: string;
  version?: string;
  selectedFlags?: SelectedFlags;
  children: string;
  type?: ButtonType;
  size?: ButtonSize;
  isCloudBuild?: boolean;
};

const DownloadFirmwareButton: React.FC<Props> = ({
  target,
  version,
  selectedFlags,
  children,
  type,
  size,
  isCloudBuild,
}) => {
  const { t } = useTranslation("flashing");
  const [downloading, setDownloading] = useState(false);
  const isPr = isPrVersion(version ?? "");
  const isLocal = version === "local";
  const { prId, commitId } = decodePrVersion(version ?? "");
  const validPrVersion = isPr && prId && commitId && target;

  const isCloudBuildValid =
    version &&
    target &&
    selectedFlags?.every((flag) => flag.name && flag.value);

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
    const fileHandle = await window.showSaveFilePicker({
      suggestedName: name,
      types: [
        {
          description: t(`Firmware data`),
          accept: {
            "application/octet-stream": [".bin"],
          },
        },
      ],
    });
    const writable = await fileHandle.createWritable();
    await writable.write(data);
    await writable.close();
  };

  const download = async (): Promise<void> => {
    // Try to get the cloudbuild build, if not found, throw an error
    if (isCloudBuild && isCloudBuildValid) {
      const flags = selectedFlags as { name: string; value: string }[];
      const response = await client.query({
        query: gql(`
          query CloudFirmware($params: CloudFirmwareParams!) {
            cloudFirmware(params: $params) {
              base64Data
            }
          }
        `),
        variables: {
          params: {
            release: version,
            target,
            flags,
          },
        },
      });

      const fileData = response.data.cloudFirmware.base64Data;
      const flagValues = flags.map((flag) => flag.value).join("-");
      await promptAndDownload(
        `${version}-${target}-${flagValues}.bin`,
        base64ArrayBuffer.decode(fileData)
      );
    } else if (validPrVersion) {
      const response = await client.query({
        query: gql(`
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
        await promptAndDownload(
          `${target}-${commitId.slice(0, 7)}.bin`,
          base64ArrayBuffer.decode(fileData)
        );
      }
    } else if (!isLocal && target && version) {
      const response = await client.query({
        query: gql(`
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
        await promptAndDownload(
          `${target}-${version}.bin`,
          base64ArrayBuffer.decode(fileData)
        );
      }
    }
  };

  return (
    <Button
      type={type}
      icon={<DownloadOutlined />}
      loading={downloading}
      disabled={
        !target || !version || isLocal || (isCloudBuild && !isCloudBuildValid)
      }
      size={size}
      onClick={async () => {
        setDownloading(true);
        await download()
          .then(() => {
            void message.success(t(`Firmware file saved`));
          })
          .catch((e: Error) => {
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
