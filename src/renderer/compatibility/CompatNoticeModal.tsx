import {
  CloseCircleOutlined,
  CheckCircleOutlined,
  GithubOutlined,
} from "@ant-design/icons";
import { Button, Checkbox, Modal, Result, Typography } from "antd";
import React from "react";
import { FullHeightCentered } from "renderer/shared/layouts";
import { Trans, useTranslation } from "react-i18next";

type Props = {
  missingUsbApi?: boolean;
  missingFilesystemApi?: boolean;
  onDontShowAgain?: (show: boolean) => void;
  visible?: boolean;
  onClose?: () => void;
};

const WebCompatInfo: React.FC<Props> = ({
  missingFilesystemApi,
  missingUsbApi,
  onDontShowAgain,
  visible,
  onClose,
}) => {
  const { t } = useTranslation("compatibility");
  return (
    <Modal
      style={{ maxWidth: "500px", top: "50px" }}
      width="100%"
      visible={visible}
      onCancel={onClose}
      closable
      footer={
        <Checkbox
          onChange={(e) => {
            onDontShowAgain?.(e.target.checked);
          }}
        >
          {t(`Don't show again`)}
        </Checkbox>
      }
    >
      <FullHeightCentered>
        <Result
          status="warning"
          title={t(`Your browser doesn't support EdgeTX Buddy`)}
          subTitle={
            <Trans t={t}>
              You can install the app, or use a browser with{" "}
              <Typography.Link
                href="https://caniuse.com/webusb"
                target="_blank"
                rel="noopener noreferrer"
              >
                WebUSB
              </Typography.Link>{" "}
              and{" "}
              <Typography.Link
                href="https://caniuse.com/native-filesystem-api"
                target="_blank"
                rel="noopener noreferrer"
              >
                File System Access API
              </Typography.Link>{" "}
              support
            </Trans>
          }
          extra={
            <Button
              href="https://github.com/EdgeTX/buddy/releases/tag/latest"
              type="primary"
              target="_blank"
              icon={<GithubOutlined />}
            >
              {t(`Go to app releases`)}
            </Button>
          }
        >
          <Typography.Paragraph>
            {missingUsbApi ? (
              <Trans t={t}>
                <CloseCircleOutlined style={{ color: "red" }} /> Missing WebUSB
                API -{" "}
                <Typography.Link
                  target="_blank"
                  href="https://developer.mozilla.org/en-US/docs/Web/API/WebUSB_API"
                >
                  Docs
                </Typography.Link>
              </Trans>
            ) : (
              <Trans t={t}>
                <CheckCircleOutlined
                  style={{ color: "var(--ant-success-color)" }}
                />{" "}
                We have WebUSB API access
              </Trans>
            )}
          </Typography.Paragraph>
          <Typography.Paragraph>
            {missingFilesystemApi ? (
              <Trans t={t}>
                <CloseCircleOutlined style={{ color: "red" }} /> Missing File
                System Access API -{" "}
                <Typography.Link
                  target="_blank"
                  href="https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API"
                >
                  Docs
                </Typography.Link>
              </Trans>
            ) : (
              <Trans t={t}>
                <CheckCircleOutlined
                  style={{ color: "var(--ant-success-color)" }}
                />{" "}
                We have File System Access API access
              </Trans>
            )}
          </Typography.Paragraph>
        </Result>
      </FullHeightCentered>
    </Modal>
  );
};

export default WebCompatInfo;
