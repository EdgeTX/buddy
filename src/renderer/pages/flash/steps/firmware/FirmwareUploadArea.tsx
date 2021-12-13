import { InboxOutlined, LoadingOutlined } from "@ant-design/icons";
import { Upload, Button, message } from "antd";
import React, { useState } from "react";
import FirmwareFileSummary from "renderer/pages/flash/components/FirmwareFileSummary";

type FirmwareFile = {
  name: string;
  base64Data: string;
};

type Props = {
  onFileSelected: (file?: FirmwareFile) => void;
  loading?: boolean;
  uploadedFile?: { name: string };
};

const ACCEPTED_TYPES = ["application/macbinary", "application/octet-stream"];

const FirmwareUploadArea: React.FC<Props> = ({
  onFileSelected,
  loading,
  uploadedFile,
}) => {
  const [encoding, setEncoding] = useState(false);

  const loadingState = encoding || loading;

  return !uploadedFile ? (
    <Upload.Dragger
      style={{
        padding: "48px 32px",
      }}
      showUploadList={false}
      multiple={false}
      disabled={loadingState}
      beforeUpload={async (file) => {
        if (ACCEPTED_TYPES.includes(file.type)) {
          setEncoding(true);
          try {
            onFileSelected({
              name: file.name,
              base64Data: Buffer.from(await file.arrayBuffer()).toString(
                "base64"
              ),
            });
          } finally {
            setEncoding(false);
          }
        } else {
          await message.error("Not a firmware file");
        }
        return false;
      }}
      accept="application/octet-stream"
    >
      <p className="ant-upload-drag-icon">
        {loadingState ? <LoadingOutlined /> : <InboxOutlined />}
      </p>

      <p className="ant-upload-text">
        {!loadingState
          ? "Click or drag a firmware file to this area to upload"
          : "Loading..."}
      </p>
    </Upload.Dragger>
  ) : (
    <FirmwareFileSummary
      name={uploadedFile.name}
      extra={
        <Button type="default" onClick={() => onFileSelected()}>
          Cancel
        </Button>
      }
    />
  );
};

export default FirmwareUploadArea;
