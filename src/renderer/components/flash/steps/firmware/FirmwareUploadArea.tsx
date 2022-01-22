import { InboxOutlined, LoadingOutlined } from "@ant-design/icons";
import { Upload, Button, message, Card } from "antd";
import React, { useState } from "react";
import FirmwareFileSummary from "renderer/components/flash/components/FirmwareFileSummary";
import styled from "styled-components";
import { Centered, FullHeight } from "renderer/shared/layouts";

type FirmwareFile = {
  name: string;
  base64Data: string;
};

type Props = {
  onFileSelected: (file?: FirmwareFile) => void;
  loading?: boolean;
  uploadedFile?: { name: string };
};

const FirmwareUploadContainer = styled.div`
  height: 100%;
  > span {
    height: 100%;
  }
`;

const ACCEPTED_TYPES = ["application/macbinary", "application/octet-stream"];

const FirmwareUploadArea: React.FC<Props> = ({
  onFileSelected,
  loading,
  uploadedFile,
}) => {
  const [encoding, setEncoding] = useState(false);

  const loadingState = encoding || loading;

  return !uploadedFile ? (
    <FirmwareUploadContainer>
      <Upload.Dragger
        style={{
          padding: "48px 32px",
          height: "100%",
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
            ? "Click here to select firmware file, or drag it here to upload."
            : "Verifying..."}
        </p>
      </Upload.Dragger>
    </FirmwareUploadContainer>
  ) : (
    <FullHeight style={{ justifyContent: "center" }}>
      <Card
        style={{ height: "100%", width: "100%" }}
        bodyStyle={{ height: "100%", width: "100%" }}
      >
        <Centered style={{ height: "100%" }}>
          <FirmwareFileSummary
            name={uploadedFile.name}
            extra={
              <Button type="default" onClick={() => onFileSelected()}>
                Remove
              </Button>
            }
          />
        </Centered>
      </Card>
    </FullHeight>
  );
};

export default FirmwareUploadArea;
