import { DownloadOutlined } from "@ant-design/icons";
import { gql, useApolloClient } from "@apollo/client";
import { Button, message } from "antd";
import React, { useState } from "react";
import { decodePrVersion, isPrVersion } from "shared/tools";
import downloadFile from "js-file-download";
import * as base64ArrayBuffer from "base64-arraybuffer";

type Props = {
  target?: string;
  version?: string;
  children: string;
};

const DownloadFirmwareButton: React.FC<Props> = ({
  target,
  version,
  children,
}) => {
  const [downloading, setDownloading] = useState(false);
  const isPr = isPrVersion(version ?? "");
  const isLocal = version === "local";
  const { prId, commitId } = decodePrVersion(version ?? "");
  const validPrVersion = isPr && prId && commitId && target;

  const client = useApolloClient();

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
        downloadFile(
          base64ArrayBuffer.decode(fileData),
          `${target}-${commitId.slice(0, 7)}.bin`,
          "application/octet-stream"
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
      });

      const fileData =
        response.data.edgeTxRelease?.firmwareBundle.target?.base64Data;

      if (fileData) {
        downloadFile(
          base64ArrayBuffer.decode(fileData),
          `${target}-${version}.bin`,
          "application/octet-stream"
        );
      }
    }
  };

  return (
    <Button
      type="link"
      icon={<DownloadOutlined />}
      loading={downloading}
      disabled={!target || !version}
      size="small"
      onClick={async () => {
        setDownloading(true);
        await download().catch((e: Error) => {
          void message.error(`Could not download firmware: ${e.message}`);
        });
        setDownloading(false);
      }}
    >
      {children}
    </Button>
  );
};

export default DownloadFirmwareButton;
