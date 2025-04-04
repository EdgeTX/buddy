import React, { useEffect, useState } from "react";
import copy from "copy-text-to-clipboard";
import { Button, Tooltip } from "antd";
import { CopyOutlined } from "@ant-design/icons";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import environment from "shared/environment";

type Props = {
  target?: string;
  version?: string;
};

const CopyUrlButton: React.FC<Props> = ({ version, target }) => {
  const { t } = useTranslation("flashing");
  const location = useLocation();

  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => {
        setCopied(false);
      }, 2000);

      return () => clearTimeout(timeout);
    }

    return undefined;
  }, [copied]);

  return (
    (<Tooltip
      open={copied}
      trigger={[]}
      placement="top"
      title={t(`Copied to clipboard`)}
    >
      <Button
        onClick={() => {
          if (version) {
            copy(
              `${
                environment.isElectron
                  ? "buddy.edgetx.org"
                  : window.location.host
              }/#${location.pathname}?version=${version}${
                target ? `&target=${target}` : ""
              }`
            );
            setCopied(true);
          }
        }}
        disabled={!version}
        type="link"
        size="small"
        icon={<CopyOutlined />}
      >
        {t(`Copy URL`)}
      </Button>
    </Tooltip>)
  );
};

export default CopyUrlButton;
