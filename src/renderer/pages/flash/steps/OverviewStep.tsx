import React, { useEffect } from "react";
import useQueryParams from "renderer/hooks/useQueryParams";
import { useQuery, gql, useMutation } from "@apollo/client";
import { Card, Skeleton, Button, Space, Typography, message } from "antd";
import styled from "styled-components";
import { DoubleRightOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { StepComponent } from "renderer/pages/flash/types";

import { Centered, FullHeight } from "renderer/pages/flash/shared";
import FirmwareFileSummary from "renderer/pages/flash/components/FirmwareFileSummary";
import FirmwareReleaseSummary from "./overview/FirmwareReleaseSummary";
import DeviceSummary from "./overview/DeviceSummary";

const Container = styled.div`
  display: flex;
  height: 100%;
  flex-direction: row;
  justify-content: space-between;
  width: 100%;
  max-height: 300px;
  width: 100%;

  > * {
    flex: 1;
  }

  margin-top: 32px;
  margin-bottom: 32px;
`;

const OverviewStep: StepComponent = ({ onRestart, onPrevious }) => {
  const { parseParam } = useQueryParams<"deviceId" | "target" | "version">();
  const navigate = useNavigate();

  const deviceId = parseParam("deviceId");
  const target = parseParam("target");
  const version = parseParam("version");

  const invalidState = !deviceId || !target || !version;
  useEffect(() => {
    if (invalidState) {
      onRestart?.();
    }
  }, [invalidState, onRestart]);

  const [createFlashJob, { loading: creatingJob }] = useMutation(
    gql(/* GraphQL */ `
      mutation CreateFlashJob($firmware: FlashFirmwareInput!, $deviceId: ID!) {
        createFlashJob(firmware: $firmware, deviceId: $deviceId) {
          id
        }
      }
    `)
  );

  if (invalidState) {
    return null;
  }

  return (
    <FullHeight>
      <Centered style={{ height: "100%" }}>
        <Card
          bodyStyle={{
            height: "100%",
          }}
          style={{
            margin: "16px",
            height: "100%",
            width: "100%",
            maxWidth: "800px",
          }}
        >
          <FullHeight style={{ width: "100%" }}>
            <Centered style={{ textAlign: "center" }}>
              <Typography.Title level={5}>
                You&apos;re all set!
              </Typography.Title>
              <Typography.Text style={{ maxWidth: "400px" }}>
                Please check everything is correct before proceeding. Flashing
                can take a few minutes so please be patient
              </Typography.Text>
            </Centered>
            <Centered style={{ height: "100%" }}>
              <Container>
                <FirmwareSummary target={target} version={version} />
                <DoubleRightOutlined
                  style={{ fontSize: "24px", marginTop: "64px" }}
                />
                <Device deviceId={deviceId} />
              </Container>
            </Centered>
            <Centered>
              <Space>
                <Button onClick={onPrevious} disabled={creatingJob}>
                  Go back
                </Button>
                <Button
                  size="large"
                  type="primary"
                  disabled={creatingJob}
                  icon={<PlayCircleOutlined />}
                  onClick={() => {
                    createFlashJob({
                      variables: { firmware: { target, version }, deviceId },
                    })
                      .then((jobCreateResult) => {
                        if (jobCreateResult.data) {
                          navigate(
                            `/flash/${jobCreateResult.data.createFlashJob.id}`
                          );
                        } else {
                          throw new Error(
                            jobCreateResult.errors
                              ?.map((error) => error.message)
                              .join(",") ?? ""
                          );
                        }
                      })
                      .catch((e: Error) => {
                        void message.error(
                          `Could not create job: ${e.message}`
                        );
                      });
                  }}
                >
                  Start
                </Button>
              </Space>
            </Centered>
          </FullHeight>
        </Card>
      </Centered>
    </FullHeight>
  );
};

const Device: React.FC<{ deviceId: string }> = ({ deviceId }) => {
  const { loading, data } = useQuery(
    gql(/* GraphQL */ `
      query DeviceInfo($deviceId: ID!) {
        flashableDevice(id: $deviceId) {
          id
          productName
          serialNumber
          vendorId
          productId
        }
      }
    `),
    {
      variables: {
        deviceId,
      },
    }
  );

  return (
    <DeviceSummary
      loading={loading}
      device={data?.flashableDevice ?? undefined}
    />
  );
};

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

export default OverviewStep;
