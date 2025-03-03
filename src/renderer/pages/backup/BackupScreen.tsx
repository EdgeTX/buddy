import { Divider } from "antd";
import React from "react";
import {
  FullHeightCentered,
  FullHeight,
  Centered,
} from "renderer/shared/layouts";
import styled from "styled-components";
import useQueryParams from "renderer/hooks/useQueryParams";
import BackupUploader from "./file/BackupUploader";

const Container = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
`;

const BackupScreen: React.FC = () => {
  const { parseParam, updateParams } = useQueryParams<
    "version" | "target" | "filters" | "selectedFlags"
  >();

  const version = parseParam("version");
  const target = parseParam("target");

  const backupUploadArea = (
    <BackupUploader
      selectedFile={version === "local" ? target : undefined}
      onFileUploaded={(fileId) => {
        if (fileId) {
          updateParams({
            target: fileId,
            version: "local",
          });
        } else {
          updateParams({
            target: undefined,
            version: undefined,
          });
        }
      }}
    />
  );

  return (
    <Container>
      <FullHeightCentered style={{ flex: 1, alignItems: "center" }}>
        <FullHeight
          style={{
            margin: "16px",
            maxWidth: 600,
            width: "100%",
            maxHeight: 900,
            justifyContent: "space-between",
          }}
        >
          {backupUploadArea}
        </FullHeight>
      </FullHeightCentered>
      <Divider type="vertical" style={{ height: "100%" }} />
      <FullHeightCentered style={{ flex: 1, maxWidth: "600px" }}>
        <Centered />
      </FullHeightCentered>
    </Container>
  );
};

export default BackupScreen;
