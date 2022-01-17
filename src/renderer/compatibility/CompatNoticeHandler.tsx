import React, { useState } from "react";
import useLocalStorage from "use-local-storage";
import { hasFilesystemApi, hasUsbApi } from "./checks";
import CompatNoticeModal from "./CompatNoticeModal";

const CompatNoticeHandler: React.FC = () => {
  const [dontShow, setDontShow] = useLocalStorage(
    "browser-compatibility-dont-show-again",
    false
  );
  const [visible, setVisible] = useState(!dontShow);

  return (
    <CompatNoticeModal
      missingUsbApi={!hasUsbApi}
      missingFilesystemApi={!hasFilesystemApi}
      onDontShowAgain={setDontShow}
      visible={(!hasUsbApi || !hasFilesystemApi) && visible}
      onClose={() => setVisible(false)}
    />
  );
};

export default CompatNoticeHandler;
