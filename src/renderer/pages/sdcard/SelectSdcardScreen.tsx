import {
  FolderOpenTwoTone,
  PoweroffOutlined,
  UsbOutlined,
  FolderOutlined,
} from "@ant-design/icons";
import { Button, Typography, Divider, Tooltip, Alert } from "antd";
import React from "react";
import {
  FullHeightCentered,
  FullHeight,
  Centered,
} from "renderer/shared/layouts";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { useMutation, gql } from "@apollo/client";
import config from "shared/config";
import checks from "renderer/compatibility/checks";
import { useTranslation, Trans } from "react-i18next";

const Container = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
`;

const Circle = styled(Centered)`
  border-radius: 64px;
  background-color: #d9d9d9;
  width: 72px;
  min-width: 72px;
  height: 72px;
  min-height: 72px;
  color: white;
  margin: 16px;
  text-align: center;
`;

const Step = styled.div`
  display: flex;
  align-items: center;
`;

const notAvailable = !config.isElectron && !checks.hasFilesystemApi;

const SelectSdcardScreen: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("sdcard");

  const [selectDirectory] = useMutation(
    gql(/* GraphQL */ `
      mutation PickSdcardDirectory {
        pickSdcardDirectory {
          id
        }
      }
    `)
  );

  return (
    <Container>
      <FullHeightCentered style={{ flex: 1, alignItems: "center" }}>
        <Alert
          type="warning"
          showIcon
          style={{ maxWidth: "500px", paddingBottom: 16 }}
          message={t(`The SD card editor is still in development`)}
          description={t(
            `You may notice missing features or bugs, it's recommended continue use Flasher as your main SD Card tool`
          )}
        />
        <FullHeight
          style={{
            margin: "16px",
            maxWidth: 600,
            width: "100%",
            maxHeight: 900,
            justifyContent: "space-between",
          }}
        >
          <Step>
            <Circle>
              <PoweroffOutlined style={{ fontSize: "32px" }} />
            </Circle>
            <Typography.Text style={{ fontSize: "16px" }}>
              <Trans t={t}>
                <b>Step 1.</b> Power on your device, make sure it's not plugged
                into USB
              </Trans>
            </Typography.Text>
          </Step>
          <Step style={{ justifyContent: "flex-end" }}>
            <Typography.Text style={{ fontSize: "16px" }}>
              <Trans t={t}>
                <b>Step 2.</b> Connect your device to the computer via USB, and
                if prompted select '<i>USB Storage</i>'
              </Trans>
            </Typography.Text>
            <Circle>
              <UsbOutlined style={{ fontSize: "32px" }} />
            </Circle>
          </Step>
          <Step>
            <Circle>
              <FolderOutlined style={{ fontSize: "32px" }} />
            </Circle>
            <Typography.Text style={{ fontSize: "16px" }}>
              <Trans t={t}>
                <b>Step 3.</b> Once connected, select the devices SD Card via
                the file explorer to make changes
              </Trans>
            </Typography.Text>
          </Step>
        </FullHeight>
      </FullHeightCentered>
      <Divider type="vertical" style={{ height: "100%" }} />
      <FullHeightCentered style={{ flex: 1, maxWidth: "600px" }}>
        <Centered>
          <FolderOpenTwoTone
            style={{
              fontSize: "48px",
              margin: "16px",
              opacity: notAvailable ? "0.2" : undefined,
            }}
          />
          <Tooltip
            trigger={notAvailable ? ["hover", "click"] : []}
            placement="bottom"
            title={t(`This feature is not supported by your browser`)}
          >
            <Button
              disabled={notAvailable}
              onClick={() => {
                void selectDirectory().then((result) => {
                  if (result.data?.pickSdcardDirectory) {
                    const directory = result.data.pickSdcardDirectory;
                    navigate(`/sdcard/${directory.id}`);
                  }
                });
              }}
            >
              {t(`Select SD Card`)}
            </Button>
          </Tooltip>
        </Centered>
      </FullHeightCentered>
    </Container>
  );
};

export default SelectSdcardScreen;
