import React, { useEffect } from "react";
import useQueryParams from "renderer/hooks/useQueryParams";
import { Card, Button, Space, Typography, message } from "antd";
import styled from "styled-components";
import { DoubleRightOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { StepComponent } from "renderer/pages/flash/types";
import { Centered, FullHeight } from "renderer/shared/layouts";
import DeviceSummary from "renderer/components/devices/DeviceSummary";
import FirmwareSummary from "renderer/components/firmware/FirmwareSummary";
import DownloadFirmwareButton from "renderer/components/firmware/DownloadFirmwareButton";
import useIsMobile from "renderer/hooks/useIsMobile";
import useCreateFlashJob from "renderer/hooks/useCreateFlashJob";
import { exception } from "react-ga";
import { useTranslation } from "react-i18next";
import useFlags from "renderer/hooks/useFlags";

const Container = styled.div<{ isMobile: boolean }>`
  display: flex;
  height: 100%;
  flex-direction: ${({ isMobile }) => (isMobile ? "column" : "row")};
  justify-content: space-around;
  width: 100%;
  max-height: ${({ isMobile }) => (!isMobile ? "300px" : "unset")};
  margin-top: 32px;
  margin-bottom: 32px;

  .flash-component {
    text-align: center;
    width: ${({ isMobile }) => (!isMobile ? "200px" : "unset")};
  }
`;

const OverviewStep: StepComponent = ({ onRestart, onPrevious }) => {
  const isMobile = useIsMobile();
  const { t } = useTranslation("flashing");
  const { parseParam } = useQueryParams<
    "deviceId" | "target" | "version" | "selectedFlags"
  >();
  const navigate = useNavigate();

  const deviceId = parseParam("deviceId");
  const target = parseParam("target");
  const version = parseParam("version");
  const { selectedFlags } = useFlags(parseParam("selectedFlags"));

  const invalidState = !deviceId || !target || !version;
  useEffect(() => {
    if (invalidState) {
      onRestart?.();
    }
  }, [invalidState, onRestart]);

  const [createFlashJob, { loading: creatingJob }] = useCreateFlashJob();

  if (invalidState) {
    return null;
  }

  return (
    <FullHeight>
      <Centered style={{ height: isMobile ? undefined : "100%" }}>
        <Card
          bodyStyle={{
            padding: isMobile ? "8px" : undefined,
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
                {t(`You're all set!`)}
              </Typography.Title>
              <Typography.Text style={{ maxWidth: "400px" }}>
                {t(
                  `Please check everything is correct before proceeding. Flashing can take a few minutes so please be patient`
                )}
              </Typography.Text>
            </Centered>
            <Centered style={{ height: "100%" }}>
              <Container isMobile={isMobile}>
                <div className="flash-component">
                  <Typography.Title level={3} style={{ textAlign: "center" }}>
                    {t(`Firmware`)}
                  </Typography.Title>
                  <Space size="large" direction="vertical">
                    <div>
                      <FirmwareSummary target={target} version={version} />
                    </div>
                    {version !== "local" && (
                      // TODO: if cloudbuild, use other button
                      <DownloadFirmwareButton
                        size="small"
                        type="link"
                        target={target}
                        version={version}
                      >
                        {t(`Download`)}
                      </DownloadFirmwareButton>
                    )}
                  </Space>
                </div>
                <DoubleRightOutlined
                  style={{
                    fontSize: "24px",
                    marginTop: isMobile ? "32px" : "64px",
                    marginBottom: isMobile ? "32px" : undefined,
                    color: "var(--ant-primary-4)",
                    transform: isMobile ? "rotate(90deg)" : undefined,
                  }}
                />
                <div className="flash-component">
                  <Typography.Title level={3} style={{ textAlign: "center" }}>
                    {t(`Radio`)}
                  </Typography.Title>
                  <DeviceSummary deviceId={deviceId} />
                </div>
              </Container>
            </Centered>
            <Centered>
              <Space>
                <Button onClick={onPrevious} disabled={creatingJob}>
                  {t(`Go back`)}
                </Button>
                <Button
                  size="large"
                  type="primary"
                  disabled={creatingJob}
                  icon={<PlayCircleOutlined />}
                  onClick={() => {
                    createFlashJob({
                      firmware: { target, version, selectedFlags },
                      deviceId,
                    })
                      .then((jobId) => {
                        navigate(`./${jobId}`);
                      })
                      .catch((e: Error) => {
                        exception({
                          description: `Error creating flash job: ${e.message}`,
                          fatal: true,
                        });

                        void message.error(
                          t(`Could not create job: {{message}}`, {
                            message: e.message,
                          })
                        );
                      });
                  }}
                >
                  {t(`Start flashing`)}
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
