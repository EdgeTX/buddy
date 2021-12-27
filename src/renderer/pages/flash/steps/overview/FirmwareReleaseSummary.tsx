import { Space, Typography } from "antd";
import React from "react";
import EdgeTxLogo from "renderer/assets/logo.webp";
import { Centered } from "renderer/shared/layouts";

const FirmwareReleaseSummary: React.FC<{
  releaseName: string;
  targetName: string;
}> = ({ releaseName, targetName }) => (
  <Space direction="vertical" size="large" style={{ width: "100%" }}>
    <Centered>
      <img
        style={{ height: "64px" }}
        src={EdgeTxLogo as string}
        alt="EdgeTX logo"
      />
    </Centered>
    <Centered>
      <Typography.Title style={{ textAlign: "center" }} level={5}>
        {releaseName}
      </Typography.Title>
      <Typography.Text style={{ textAlign: "center" }} type="secondary">
        {targetName}
      </Typography.Text>
    </Centered>
  </Space>
);

export default FirmwareReleaseSummary;
