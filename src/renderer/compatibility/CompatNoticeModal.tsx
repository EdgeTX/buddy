import {
  CloseCircleOutlined,
  CheckCircleOutlined,
  GithubOutlined,
} from "@ant-design/icons";
import { Button, Checkbox, Modal, Result, Typography } from "antd";
import React from "react";
import { FullHeightCentered } from "renderer/shared/layouts";

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
}) => (
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
        Don&apos;t show again
      </Checkbox>
    }
  >
    <FullHeightCentered>
      <Result
        status="warning"
        title="Your browser doesn't support EdgeTX Buddy"
        subTitle="You can install the app, or use an update-to-date Chromium based browser"
        extra={
          <Button
            href="https://github.com/EdgeTX/buddy/releases/tag/latest"
            type="primary"
            target="_blank"
            icon={<GithubOutlined />}
          >
            Go to app releases
          </Button>
        }
      >
        <Typography.Paragraph>
          {missingUsbApi ? (
            <>
              <CloseCircleOutlined style={{ color: "red" }} /> Missing WebUSB
              API -{" "}
              <Typography.Link
                target="_blank"
                href="https://developer.mozilla.org/en-US/docs/Web/API/WebUSB_API"
              >
                Docs
              </Typography.Link>
            </>
          ) : (
            <>
              <CheckCircleOutlined
                style={{ color: "var(--ant-success-color)" }}
              />{" "}
              We have WebUSB API access
            </>
          )}
        </Typography.Paragraph>
        <Typography.Paragraph>
          {missingFilesystemApi ? (
            <>
              <CloseCircleOutlined style={{ color: "red" }} /> Missing File
              System Access API -{" "}
              <Typography.Link
                target="_blank"
                href="https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API"
              >
                Docs
              </Typography.Link>
            </>
          ) : (
            <>
              <CheckCircleOutlined
                style={{ color: "var(--ant-success-color)" }}
              />{" "}
              We have File System Access API access
            </>
          )}
        </Typography.Paragraph>
      </Result>
    </FullHeightCentered>
  </Modal>
);

export default WebCompatInfo;
