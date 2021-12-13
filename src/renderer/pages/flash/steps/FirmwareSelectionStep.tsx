import React, { useEffect, useState } from "react";
import { Tabs, Button, Divider, Typography } from "antd";
import { RocketOutlined, UploadOutlined } from "@ant-design/icons";
import useQueryParams from "renderer/hooks/useQueryParams";
import styled from "styled-components";

import { StepComponent } from "renderer/pages/flash/types";
import {
  StepControlsContainer,
  StepContentContainer,
  Centered,
  FullHeight,
} from "renderer/pages/flash/shared";
import FirmwareReleasesPicker from "./firmware/FirmwareReleasesPicker";
import FirmwareReleaseDescription from "./firmware/FirmwareReleaseDescription";
import FirmwareUploader from "./firmware/FirmwareUploader";

const ReleaseStepContainer = styled.div`
  display: flex;
  flex-direction: row;
  height: 100%;

  > * {
    flex: 1;
    height: 100%;
  }

  > :first-child {
    max-width: 340px;
  }

  > .divider {
    flex: 0;
  }
`;

const DescriptionContainer = styled.div`
  overflow-y: auto;
  padding-left: 32px;
  padding-top: 32px;
  /* TODO: Fix this massive hack */
  height: calc(100vh - 380px);
`;

const FirmwareStep: StepComponent = ({ onNext }) => {
  const { parseParam, updateParams } = useQueryParams<"version" | "target">();
  const [activeTab, setActiveTab] = useState<string>("releases");

  const version = parseParam("version");
  const target = parseParam("target");

  useEffect(() => {
    if (target === "local" && activeTab !== "file") {
      setActiveTab("file");
    }
  }, [setActiveTab, target, activeTab]);

  return (
    <FullHeight>
      <StepContentContainer>
        <Tabs
          activeKey={activeTab}
          destroyInactiveTabPane
          onChange={(key) => {
            updateParams({
              version: undefined,
              target: undefined,
            });
            setActiveTab(key);
          }}
        >
          <Tabs.TabPane
            tab={
              <span>
                <RocketOutlined />
                Releases
              </span>
            }
            key="releases"
          >
            <ReleaseStepContainer style={{ justifyContent: "space-around" }}>
              <FirmwareReleasesPicker
                version={version}
                target={target}
                onChanged={updateParams}
              />
              <Divider className="divider" type="vertical" />
              {version ? (
                <DescriptionContainer>
                  <FirmwareReleaseDescription releaseId={version} />
                </DescriptionContainer>
              ) : (
                <Centered>
                  <Typography.Title level={4} type="secondary">
                    Release notes
                  </Typography.Title>
                </Centered>
              )}
            </ReleaseStepContainer>
          </Tabs.TabPane>
          <Tabs.TabPane
            tab={
              <span>
                <UploadOutlined />
                File
              </span>
            }
            key="file"
          >
            <FirmwareUploader
              selectedFile={target === "local" ? version : undefined}
              onFileUploaded={(fileId) => {
                if (fileId) {
                  updateParams({
                    version: fileId,
                    target: "local",
                  });
                } else {
                  updateParams({
                    target: undefined,
                    version: undefined,
                  });
                }
              }}
            />
          </Tabs.TabPane>
        </Tabs>
      </StepContentContainer>
      <StepControlsContainer>
        <Button
          type="primary"
          size="large"
          onClick={() => {
            if (target && version) {
              onNext?.();
            }
          }}
        >
          Next
        </Button>
      </StepControlsContainer>
    </FullHeight>
  );
};

export default FirmwareStep;
