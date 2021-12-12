import React, { useState } from "react";
import FirmwareUploadArea from "renderer/pages/flash/components/FirmwareUploadArea";
import { action } from "@storybook/addon-actions";

export default {
  title: "Flashing/Firmware Selection/FirmwareUploadArea",
  component: FirmwareUploadArea,
};

export const uploadFirmware: React.FC<Parameters<typeof FirmwareUploadArea>> = (
  props
) => (
  <FirmwareUploadArea {...props} onFileSelected={action("onFileSelected")} />
);

export const fileUploaded: React.FC<Parameters<typeof FirmwareUploadArea>> = (
  props
) => (
  <FirmwareUploadArea
    {...props}
    onFileSelected={action("onFileSelected")}
    uploadedFile={{ name: "nv14-28cdb40.bin" }}
  />
);

export const withState: React.FC = () => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [file, setFile] = useState<{ name: string }>();
  return <FirmwareUploadArea onFileSelected={setFile} uploadedFile={file} />;
};
