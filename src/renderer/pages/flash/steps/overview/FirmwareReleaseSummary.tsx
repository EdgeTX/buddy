import { Space, Typography } from "antd";
import React from "react";
import EdgeTxLogo from "renderer/assets/logo.webp";
import { Centered } from "renderer/pages/flash/shared";

const FirmwareReleaseSummary: React.FC<{
  releaseName: string;
  targetName: string;
}> = ({ releaseName, targetName }) => (
  <Space direction="vertical" size="large">
    <Centered>
      <img
        style={{ height: "64px" }}
        src={EdgeTxLogo as string}
        alt="EdgeTX logo"
      />
    </Centered>
    <Centered>
      <Typography.Title style={{ textAlign: "center" }} level={4}>
        {releaseName}
      </Typography.Title>
      <Typography.Text style={{ textAlign: "center" }} type="secondary">
        {targetName}
      </Typography.Text>
    </Centered>
  </Space>
);

export default FirmwareReleaseSummary;
