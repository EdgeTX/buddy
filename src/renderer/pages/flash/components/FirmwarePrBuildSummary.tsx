import { BranchesOutlined } from "@ant-design/icons";
import { Space, Typography } from "antd";
import React from "react";
import { Centered } from "renderer/shared/layouts";

const FirmwarePrBuildSummary: React.FC<{
  branchName: string;
  commitId: string;
  targetName: string;
  hideIcon?: boolean;
}> = ({ branchName, commitId, targetName, hideIcon }) => (
  <Space direction="vertical" size="large" style={{ width: "100%" }}>
    {!hideIcon && (
      <Centered>
        <BranchesOutlined
          style={{ fontSize: "64px", color: "var(--ant-info-color)" }}
        />
      </Centered>
    )}
    <Centered>
      <Typography.Title style={{ textAlign: "center" }} level={5}>
        {branchName}
      </Typography.Title>
      <Typography.Text style={{ textAlign: "center" }} type="secondary">
        {commitId.slice(0, 7)}
      </Typography.Text>
      <Typography.Text style={{ textAlign: "center" }} type="secondary">
        {targetName}
      </Typography.Text>
    </Centered>
  </Space>
);

export default FirmwarePrBuildSummary;
