import { WarningOutlined } from "@ant-design/icons";
import { Result } from "antd";
import React from "react";

const FirmwareUnknownSummary: React.FC<{ hideIcon?: boolean }> = ({
  hideIcon,
}) => (
  <Result
    style={{
      padding: 0,
    }}
    status="warning"
    icon={hideIcon ? <div /> : <WarningOutlined />}
    title="Unknown firmware"
  />
);

export default FirmwareUnknownSummary;
