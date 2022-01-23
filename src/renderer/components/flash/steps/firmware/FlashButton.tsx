import { UsbOutlined, WarningOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import React from "react";
import { hasUsbApi } from "renderer/compatibility/checks";
import config from "shared/config";

const FLASHING_AVAILABLE = config.isElectron || hasUsbApi;

type Props = {
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
};

const FlashButton: React.FC<Props> = ({
  onClick,
  disabled = false,
  loading = false,
}) => (
  <Tooltip
    trigger={!FLASHING_AVAILABLE ? ["hover", "click"] : []}
    placement="top"
    title="Not supported by your browser"
  >
    <Button
      disabled={disabled || !FLASHING_AVAILABLE}
      loading={loading}
      type="primary"
      icon={FLASHING_AVAILABLE ? <UsbOutlined /> : <WarningOutlined />}
      onClick={onClick}
    >
      Flash via USB
    </Button>
  </Tooltip>
);

export default FlashButton;
