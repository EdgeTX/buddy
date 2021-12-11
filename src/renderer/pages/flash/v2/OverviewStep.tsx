import React, { useEffect } from "react";
import useQueryParams from "renderer/hooks/useQueryParams";
import { useQuery, gql } from "@apollo/client";
import { Card, Skeleton, Button, Space } from "antd";
import styled from "styled-components";
import { PlayCircleOutlined } from "@ant-design/icons";
import { StepComponent } from "./types";

import {
  Centered,
  FullHeight,
  StepContentContainer,
  StepControlsContainer,
} from "./shared";
import FirmwareReleaseSummary from "./components/FirmwareReleaseSummary";
import FirmwareFileSummary from "./components/FirmwareFileSummary";

const FirmwareSummary: React.FC<{ target: string; version: string }> = ({
  target,
  version,
}) => {
  const isFile = target === "local";

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
      skip: isFile,
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
        fileId: version,
      },
      skip: !isFile,
    }
  );

  if (firmwareFileQuery.loading || releaseInfoQuery.loading) {
    return (
      <div>
        <Centered>
          <Skeleton.Avatar active size="large" shape="square" />
        </Centered>
        <Skeleton title active />
      </div>
    );
  }

  if (!isFile && releaseInfoQuery.data) {
    return (
      <FirmwareReleaseSummary
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
      name={firmwareFileQuery.data?.localFirmware?.name ?? "Unknown"}
    />
  );
};

const Container = styled.div`
  display: flex;
  height: 100%;
  flex-direction: row;
  justify-content: space-between;
  max-width: 1200px;
  max-height: 300px;

  > * {
    max-width: 400px;
    flex: 1;
  }

  margin-bottom: 16px;
`;

const OverviewStep: StepComponent = ({ onRestart }) => {
  const { parseParam } = useQueryParams<"deviceId" | "target" | "version">();

  const deviceId = parseParam("deviceId");
  const target = parseParam("target");
  const version = parseParam("version");

  const invalidState = !deviceId || !target || !version;
  useEffect(() => {
    if (invalidState) {
      onRestart?.();
    }
  }, [invalidState, onRestart]);

  if (invalidState) {
    return null;
  }

  return (
    <FullHeight>
      <StepContentContainer>
        <FullHeight>
          <Container>
            <Card
              bodyStyle={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
              }}
              style={{ height: "100%" }}
            >
              <FirmwareSummary target={target} version={version} />
            </Card>
          </Container>
        </FullHeight>
      </StepContentContainer>
      <StepControlsContainer>
        <Space>
          <Button type="primary" icon={<PlayCircleOutlined />}>
            Start
          </Button>
          <Button>Previous</Button>
        </Space>
      </StepControlsContainer>
    </FullHeight>
  );
};

export default OverviewStep;
