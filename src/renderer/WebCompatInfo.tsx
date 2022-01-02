import {
  CloseCircleOutlined,
  CheckCircleOutlined,
  GithubOutlined,
} from "@ant-design/icons";
import { Button, Modal, Result, Typography } from "antd";
import React from "react";
import { FullHeightCentered } from "./shared/layouts";

type Props = {
  missingUsbApi?: boolean;
  missingFilesystemApi?: boolean;
};

const WebCompatInfo: React.FC<Props> = ({
  missingFilesystemApi,
  missingUsbApi,
}) => (
  <Modal
    style={{ maxWidth: "500px" }}
    width="100%"
    visible
    closable={false}
    closeIcon={false}
    footer={null}
  >
    <FullHeightCentered>
      <Result
        status="warning"
        title="Your browser doesn't support EdgeTX Buddy"
        subTitle="You can install the app, or use an update-to-date version of a Chromium based browser"
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
              We have File System Acess API access
            </>
          )}
        </Typography.Paragraph>
      </Result>
    </FullHeightCentered>
  </Modal>
);

export default WebCompatInfo;
