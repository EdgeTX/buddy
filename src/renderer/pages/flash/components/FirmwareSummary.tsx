import { gql, useQuery } from "@apollo/client";
import { Skeleton } from "antd";
import React from "react";
import { Centered } from "renderer/shared/layouts";
import FirmwareFileSummary from "./FirmwareFileSummary";
import FirmwareReleaseSummary from "./FirmwareReleaseSummary";

const FirmwareSummary: React.FC<{
  target: string;
  version: string;
  loading?: boolean;
  hideIcon?: boolean;
}> = ({ target, version, hideIcon, loading }) => {
  const isFile = version === "local";

  const releaseInfoQuery = useQuery(
    gql(/* GraphQL */ `
      query ReleaseInfo($version: ID!, $target: ID!) {
        edgeTxRelease(id: $version) {
          id
          name
          firmwareBundle {
            id
            target(id: $target) {
              id
              name
            }
          }
        }
      }
    `),
    {
      variables: {
        target,
        version,
      },
      skip: isFile || loading,
    }
  );

  const firmwareFileQuery = useQuery(
    gql(/* GraphQL */ `
      query LocalFirmwareInfo($fileId: ID!) {
        localFirmware(byId: $fileId) {
          id
          name
        }
      }
    `),
    {
      variables: {
        fileId: target,
      },
      skip: !isFile || loading,
    }
  );

  if (firmwareFileQuery.loading || releaseInfoQuery.loading || loading) {
    return (
      <div>
        {!hideIcon && (
          <Centered style={{ marginBottom: "32px" }}>
            <Skeleton.Avatar
              active
              size="large"
              style={{ height: "64px", width: "64px" }}
              shape="square"
            />
          </Centered>
        )}
        <Skeleton title={false} paragraph={{ rows: 2 }} active />
      </div>
    );
  }

  if (!isFile && releaseInfoQuery.data) {
    return (
      <FirmwareReleaseSummary
        hideIcon={hideIcon}
        releaseName={releaseInfoQuery.data.edgeTxRelease?.name ?? "Unknown"}
        targetName={
          releaseInfoQuery.data.edgeTxRelease?.firmwareBundle.target?.name ??
          "Unknown"
        }
      />
    );
  }

  return (
    <FirmwareFileSummary
      hideIcon={hideIcon}
      name={firmwareFileQuery.data?.localFirmware?.name ?? "Unknown"}
    />
  );
};

export default FirmwareSummary;
