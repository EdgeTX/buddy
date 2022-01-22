import { LoadingOutlined } from "@ant-design/icons";
import { Modal, Typography, Progress, Space, Collapse } from "antd";
import React from "react";

type Props = {
  activeStep: "download" | "erase" | "write";
  stepProgress: number;
  stepError?: string | null;
  stepDetails?: React.ReactNode;
  onCancel?: () => void;
};

const stepContents = {
  download: {
    title: "Downloading",
    text: "Fetching required contents",
  },
  erase: {
    title: "Erasing",
    text: "Removing existing data",
  },
  write: {
    title: "Writing",
    text: "Unpacking assets onto the SD card",
  },
};

const JobStatusModal: React.FC<Props> = ({
  onCancel,
  activeStep,
  stepError,
  stepProgress,
  stepDetails,
}) => (
  <Modal
    maskClosable={false}
    closable={false}
    title={
      <Space>
        <LoadingOutlined style={{ color: "var(--ant-primary-color)" }} />
        <Typography.Text>{stepContents[activeStep].title}</Typography.Text>
      </Space>
    }
    visible
    okButtonProps={{ style: { display: "none" } }}
    onCancel={onCancel}
  >
    <Space direction="vertical" style={{ width: "100%" }}>
      <Typography.Text>{stepContents[activeStep].text}</Typography.Text>
      <Progress
        key={activeStep}
        // Round to 2dp
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        percent={Math.round(stepProgress * 100) / 100}
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        status={stepError ? "exception" : "active"}
      />
      {stepDetails && (
        <Collapse ghost>
          <Collapse.Panel header="Details" key="1">
            {stepDetails}
          </Collapse.Panel>
        </Collapse>
      )}
    </Space>
  </Modal>
);

export default JobStatusModal;
