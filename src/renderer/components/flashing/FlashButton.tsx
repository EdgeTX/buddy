import { UsbOutlined, WarningOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import React from "react";
import { useTranslation } from "react-i18next";
import checks from "renderer/compatibility/checks";
import environment from "shared/environment";

type Props = {
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
};

const FlashButton: React.FC<Props> = ({
  onClick,
  disabled = false,
  loading = false,
}) => {
  const { t } = useTranslation("flashing");
  const flashingAvailable = environment.isElectron || checks.hasUsbApi;

  let tooltipTitle: string | undefined;
  if (!flashingAvailable) {
    tooltipTitle = t(`Not supported by your browser`);
  }

  return (
    <Tooltip
      trigger={!flashingAvailable ? ["hover", "click"] : []}
      placement="top"
      title={tooltipTitle}
    >
      <Button
        disabled={disabled || !flashingAvailable}
        loading={loading}
        type="primary"
        icon={flashingAvailable ? <UsbOutlined /> : <WarningOutlined />}
        onClick={onClick}
      >
        {t(`Flash via USB`)}
      </Button>
    </Tooltip>
  );
};

export default FlashButton;
