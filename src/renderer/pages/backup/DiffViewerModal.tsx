import React from "react";
import { Modal, Typography } from "antd";
import { SwapOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

type DiffViewerModalProps = {
  visible: boolean;
  modelName: string;
  existingContent: string;
  backupContent: string;
  onClose: () => void;
};

const DiffContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  max-height: 600px;
`;

const ContentPanel = styled.div`
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const PanelHeader = styled.div`
  background: #fafafa;
  padding: 8px 12px;
  border-bottom: 1px solid #d9d9d9;
  font-weight: 500;
`;

const CodeBlock = styled.pre`
  margin: 0;
  padding: 12px;
  font-family: "Courier New", monospace;
  font-size: 12px;
  line-height: 1.5;
  overflow: auto;
  max-height: 550px;
  background: #ffffff;

  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
  }

  &::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
`;

const DiffViewerModal: React.FC<DiffViewerModalProps> = ({
  visible,
  modelName,
  existingContent,
  backupContent,
  onClose,
}) => {
  const { t } = useTranslation("backup");

  // Simple line-by-line comparison highlighting
  const renderContentWithHighlight = (
    content: string,
    compareContent: string
  ): React.ReactElement[] => {
    const lines = content.split("\n");
    const compareLines = compareContent.split("\n");

    return lines.map((line, index) => {
      const isDifferent = compareLines[index] !== line;
      const style: React.CSSProperties = isDifferent
        ? { backgroundColor: "#fff1f0", color: "#cf1322" }
        : {};

      // Use line content + index for unique key, avoiding array index alone
      const uniqueKey = `${line.substring(0, 30)}-${index}`;

      return (
        <div key={uniqueKey} style={style}>
          {line || " "}
        </div>
      );
    });
  };

  return (
    <Modal
      title={
        <span>
          <SwapOutlined style={{ marginRight: 8 }} />
          {t(`Compare model versions`)}: {modelName}
        </span>
      }
      visible={visible}
      onCancel={onClose}
      onOk={onClose}
      width={1200}
      cancelButtonProps={{ style: { display: "none" } }}
      okText={t(`Close`)}
    >
      <Typography.Paragraph type="secondary">
        {t(`Lines highlighted in red differ between versions`)}
      </Typography.Paragraph>

      <DiffContainer>
        <ContentPanel>
          <PanelHeader>{t(`Current version (on SD card)`)}</PanelHeader>
          <CodeBlock>
            {renderContentWithHighlight(existingContent, backupContent)}
          </CodeBlock>
        </ContentPanel>

        <ContentPanel>
          <PanelHeader>{t(`Backup version (to restore)`)}</PanelHeader>
          <CodeBlock>
            {renderContentWithHighlight(backupContent, existingContent)}
          </CodeBlock>
        </ContentPanel>
      </DiffContainer>
    </Modal>
  );
};

export default DiffViewerModal;
