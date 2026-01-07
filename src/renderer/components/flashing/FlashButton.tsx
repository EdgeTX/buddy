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
  const isUf2OnlyModel = target && UF2_ONLY_MODELS.includes(target);
  const flashingAvailable =
    (environment.isElectron || checks.hasUsbApi) && !isUf2OnlyModel;

  let tooltipTitle: string | undefined;
  if (isUf2OnlyModel) {
    tooltipTitle = t(`This radio should be flashed via UF2 instead`);
  } else if (!flashingAvailable) {
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
