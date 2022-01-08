import { gql, useQuery } from "@apollo/client";
import { Skeleton } from "antd";
import React from "react";
import { Centered } from "renderer/shared/layouts";
import { decodePrVersion, isPrVersion } from "shared/tools";
import FirmwareFileSummary from "./FirmwareFileSummary";
import FirmwarePrBuildSummary from "./FirmwarePrBuildSummary";
import FirmwareReleaseSummary from "./FirmwareReleaseSummary";

const FirmwareSummary: React.FC<{
  target: string;
  version: string;
  loading?: boolean;
  hideIcon?: boolean;
}> = ({ target, version, hideIcon, loading }) => {
  const isFile = version === "local";
  const isPr = isPrVersion(version);

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

  const prVersion = decodePrVersion(version);

  const prFirmwareQuery = useQuery(
    gql(/* GraphQL */ `
      query PrFirmwareInfo($prId: ID!, $commitId: ID!, $target: ID!) {
        edgeTxPr(id: $prId) {
          id
          name
          commit(id: $commitId) {
            id
            firmwareBundle {
              id
              target(id: $target) {
                id
                name
              }
            }
          }
        }
      }
    `),
    {
      skip: !isPr,
      variables: {
        prId: prVersion.prId ?? "",
        commitId: prVersion.commitId ?? "",
        target,
      },
    }
  );

  if (
    firmwareFileQuery.loading ||
    releaseInfoQuery.loading ||
    prFirmwareQuery.loading ||
    loading
  ) {
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
        <Skeleton
          title={false}
          paragraph={{ rows: 2, width: "150px" }}
          active
        />
      </div>
    );
  }

  if (isPr && prFirmwareQuery.data) {
    return (
      <FirmwarePrBuildSummary
        hideIcon={hideIcon}
        branchName={prFirmwareQuery.data.edgeTxPr?.name ?? "Unknown"}
        commitId={prFirmwareQuery.data.edgeTxPr?.commit?.id ?? "Unknown"}
        targetName={
          prFirmwareQuery.data.edgeTxPr?.commit?.firmwareBundle?.target?.name ??
          "Unknown"
        }
      />
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
