import React, { useEffect } from "react";
import useQueryParams from "renderer/hooks/useQueryParams";
import { gql, useMutation } from "@apollo/client";
import { Card, Button, Space, Typography, message } from "antd";
import styled from "styled-components";
import { DoubleRightOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { StepComponent } from "renderer/pages/flash/types";
import { Centered, FullHeight } from "renderer/shared/layouts";
import DeviceSummary from "renderer/pages/flash/components/DeviceSummary";
import FirmwareSummary from "renderer/pages/flash/components/FirmwareSummary";

const Container = styled.div`
  display: flex;
  height: 100%;
  flex-direction: row;
  justify-content: space-around;
  width: 100%;
  max-height: 300px;
  margin-top: 32px;
  margin-bottom: 32px;

  .flash-component {
    width: 200px;
  }
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
                <div className="flash-component">
                  <Typography.Title level={3} style={{ textAlign: "center" }}>
                    Firmware
                  </Typography.Title>
                  <FirmwareSummary target={target} version={version} />
                </div>
                <DoubleRightOutlined
                  style={{
                    fontSize: "24px",
                    marginTop: "64px",
                    color: "var(--ant-primary-4)",
                  }}
                />
                <div className="flash-component">
                  <Typography.Title level={3} style={{ textAlign: "center" }}>
                    Radio
                  </Typography.Title>
                  <DeviceSummary deviceId={deviceId} />
                </div>
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
                  Start flashing
                </Button>
              </Space>
            </Centered>
          </FullHeight>
        </Card>
      </Centered>
    </FullHeight>
  );
};

export default OverviewStep;
