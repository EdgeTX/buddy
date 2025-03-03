import { InboxOutlined, LoadingOutlined } from "@ant-design/icons";
import { Upload, Button, Card } from "antd";
import React, { useState } from "react";
import BackupFileSummary from "renderer/components/backup/summary-variants/BackupFileSummary";
import styled from "styled-components";
import { Centered, FullHeight } from "renderer/shared/layouts";
import { useTranslation } from "react-i18next";

type BackupFile = {
  name: string;
  base64Data: string;
};

type Props = {
  onFileSelected: (file?: BackupFile) => void;
  loading?: boolean;
  uploadedFile?: { name: string };
};

const BackupUploadContainer = styled.div`
  height: 100%;
  > span {
    height: 100%;
  }
`;

// const ACCEPTED_TYPES = ["application/zip", "application/etx", "application/x-yaml", "text/yaml"];

const BackupUploadArea: React.FC<Props> = ({
  onFileSelected,
  loading,
  uploadedFile,
}) => {
  const [encoding, setEncoding] = useState(false);
  const { t } = useTranslation("backup");

  const loadingState = encoding || loading;

  return !uploadedFile ? (
    <BackupUploadContainer>
      <Upload.Dragger
        style={{
          padding: "48px 32px",
          height: "100%",
        }}
        showUploadList={false}
        multiple={false}
        disabled={loadingState}
        beforeUpload={async (file) => {
          // if (ACCEPTED_TYPES.includes(file.type)) {
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
          // } else {
          //   await message.error(t(`Not a backup file`));
          // }
          return false;
        }}
        accept="application/x-yaml"
      >
        <p className="ant-upload-drag-icon">
          {loadingState ? <LoadingOutlined /> : <InboxOutlined />}
        </p>

        <p className="ant-upload-text">
          {!loadingState
            ? t(`Click here to select backup file, or drag it here to upload.`)
            : t(`Verifying...`)}
        </p>
      </Upload.Dragger>
    </BackupUploadContainer>
  ) : (
    <FullHeight style={{ justifyContent: "center" }}>
      <Card
        style={{ height: "100%", width: "100%" }}
        bodyStyle={{ height: "100%", width: "100%" }}
      >
        <Centered style={{ height: "100%" }}>
          <BackupFileSummary
            name={uploadedFile.name}
            extra={
              <Button type="default" onClick={() => onFileSelected()}>
                {t(`Remove`)}
              </Button>
            }
          />
        </Centered>
      </Card>
    </FullHeight>
  );
};

export default BackupUploadArea;
