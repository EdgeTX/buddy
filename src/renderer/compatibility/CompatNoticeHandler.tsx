import React, { useState } from "react";
import { useSettings } from "renderer/settings";
import checks from "./checks";
import CompatNoticeModal from "./CompatNoticeModal";

const CompatNoticeHandler: React.FC = () => {
  const [settings, updateSettings] = useSettings();
  const dontShow = settings.browserCompatDismissed;

  const [visible, setVisible] = useState(!dontShow);

  return (
    <CompatNoticeModal
      missingUsbApi={!checks.hasUsbApi}
      missingFilesystemApi={!checks.hasFilesystemApi}
      onDontShowAgain={() => {
        updateSettings({ browserCompatDismissed: true });
      }}
      visible={(!checks.hasUsbApi || !checks.hasFilesystemApi) && visible}
      onClose={() => setVisible(false)}
    />
  );
};

export default CompatNoticeHandler;
