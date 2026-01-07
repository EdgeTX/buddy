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
  target?: string;
};

// Radio models that only support UF2 flashing
const UF2_ONLY_MODELS = ["st16", "pa01", "t15pro", "tx15"];

const FlashButton: React.FC<Props> = ({
  onClick,
  disabled = false,
  loading = false,
  target,
}) => {
  const { t } = useTranslation("flashing");
  const flashingAvailable = environment.isElectron || checks.hasUsbApi;
  const isUf2OnlyModel = target && UF2_ONLY_MODELS.includes(target);
  const isDisabled = disabled || !flashingAvailable || isUf2OnlyModel;
  const showUf2Tooltip = isUf2OnlyModel && flashingAvailable;

  return (
    <Tooltip
      trigger={isDisabled ? ["hover", "click"] : []}
      placement="top"
      title={
        showUf2Tooltip
          ? t(`This radio should be flashed via UF2 method`)
          : !flashingAvailable
            ? t(`Not supported by your browser`)
            : undefined
      }
    >
      <Button
        disabled={isDisabled}
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
