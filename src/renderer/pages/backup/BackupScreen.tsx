import { UploadOutlined, DownloadOutlined } from "@ant-design/icons";
import { Tabs, Typography } from "antd";
import React, { useState } from "react";
import { FullHeight } from "renderer/shared/layouts";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import BackupRestoreFlow from "./BackupRestoreFlow";
import BackupCreateFlow from "./BackupCreateFlow";

const Container = styled.div`
  display: flex;
  flex-direction: row;
  height: 100%;
  padding: 32px;
  gap: 24px;

  > * {
    flex: 1;
    height: 100%;
  }

  > :first-child {
    max-width: 200px;
  }

  @media screen and (max-width: 800px) {
    flex-direction: column;
    padding: 16px;
    gap: 24px;

    > :first-child {
      max-width: 100%;
    }
  }
`;

const ContentContainer = styled.div`
  overflow-y: auto;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const BackupScreen: React.FC = () => {
  const { t } = useTranslation("backup");
  const [activeTab, setActiveTab] = useState<string>("restore");

  return (
    <FullHeight>
      <Container>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key)}
          tabPosition="left"
        >
          <Tabs.TabPane
            tab={
              <span>
                <UploadOutlined />
                {t(`Restore backup`)}
              </span>
            }
            key="restore"
          >
            {/* Content rendered on the right side */}
          </Tabs.TabPane>
          <Tabs.TabPane
            tab={
              <span>
                <DownloadOutlined />
                {t(`Create backup`)}
              </span>
            }
            key="create"
          >
            {/* Content rendered on the right side */}
          </Tabs.TabPane>
        </Tabs>

        <ContentContainer>
          <Typography.Title
            level={3}
            style={{ marginTop: 0, marginBottom: 12 }}
          >
            {activeTab === "restore" ? t(`Restore backup`) : t(`Create backup`)}
          </Typography.Title>
          {activeTab === "restore" && <BackupRestoreFlow />}
          {activeTab === "create" && <BackupCreateFlow />}
        </ContentContainer>
      </Container>
    </FullHeight>
  );
};

export default BackupScreen;
