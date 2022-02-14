import { WarningOutlined } from "@ant-design/icons";
import { Result } from "antd";
import React from "react";
import { useTranslation } from "react-i18next";

const FirmwareUnknownSummary: React.FC<{ hideIcon?: boolean }> = ({
  hideIcon,
}) => {
  const { t } = useTranslation("flashing");
  return (
    <Result
      style={{
        padding: 0,
      }}
      status="warning"
      icon={hideIcon ? <div /> : <WarningOutlined />}
      title={t(`Unknown firmware`)}
    />
  );
};

export default FirmwareUnknownSummary;
