import React, { useEffect, useState } from "react";
import { Tabs, Divider, Typography } from "antd";
import { RocketOutlined, UploadOutlined } from "@ant-design/icons";
import useQueryParams from "renderer/hooks/useQueryParams";
import styled from "styled-components";

import { StepComponent } from "renderer/pages/flash/types";
import {
  StepContentContainer,
  StepControlsContainer,
} from "renderer/pages/flash/shared";
import { Centered, FullHeight } from "renderer/shared/layouts";
import useVersionFilters from "renderer/hooks/useVersionFilters";
import useIsMobile from "renderer/hooks/useIsMobile";
import DownloadFirmwareButton from "renderer/components/firmware/DownloadFirmwareButton";
import CopyUrlButton from "renderer/components/firmware/CopyUrlButton";
import FlashButton from "renderer/components/flashing/FlashButton";
import FirmwareReleasesPicker from "./firmware/FirmwareReleasesPicker";
import FirmwareReleaseDescription from "./firmware/FirmwareReleaseDescription";
import FirmwareUploader from "./firmware/FirmwareUploader";

const Container = styled.div`
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
    margin-left: 16px;
  }

  @media screen and (max-width: 800px) {
    > * {
      display: none;
    }

    > :first-child {
      display: unset;
    }

    flex-direction: column;
  }
`;

const DescriptionContainer = styled.div`
  overflow-y: auto;
  padding-left: 32px;
  padding-top: 32px;
  height: 100%;
`;

const FirmwareStep: StepComponent = ({ onNext }) => {
  const isMobile = useIsMobile();
  const { parseParam, updateParams } = useQueryParams<
    "version" | "target" | "filters"
  >();
  const [activeTab, setActiveTab] = useState<string>("releases");

  const version = parseParam("version");
  const target = parseParam("target");
  const { filters, encodeFilters } = useVersionFilters(parseParam("filters"));

  useEffect(() => {
    if (version === "local" && activeTab !== "file") {
      setActiveTab("file");
    }
  }, [setActiveTab, version, activeTab]);

  const firmwareUploadArea = (
    <FirmwareUploader
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
    <FullHeight>
      <StepContentContainer>
        <Container style={{ justifyContent: "space-around" }}>
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
                  Cloud
                </span>
              }
              key="releases"
            >
              <FirmwareReleasesPicker
                version={version}
                target={target}
                filters={filters}
                onChanged={(params) => {
                  if (activeTab === "releases") {
                    updateParams({
                      ...params,
                      filters: encodeFilters(params.filters),
                    });
                  }
                }}
              />
              <Divider />
              <CopyUrlButton target={target} version={version} />
            </Tabs.TabPane>
            ,
            <Tabs.TabPane
              tab={
                <span>
                  <UploadOutlined />
                  Local file
                </span>
              }
              key="file"
            >
              <div style={{ marginTop: "16px" }}>
                {!target && !isMobile ? (
                  <>
                    <div>
                      <Typography.Text type="secondary">
                        • Local firmware file should be a binary (.bin)
                      </Typography.Text>
                    </div>
                    <div>
                      <Typography.Text type="secondary">
                        • These can be built locally or downloaded from the
                        EdgeTX releases
                      </Typography.Text>
                    </div>
                  </>
                ) : (
                  firmwareUploadArea
                )}
              </div>
            </Tabs.TabPane>
          </Tabs>
          <Divider className="divider" type="vertical" />

          {activeTab === "releases" && (
            <DescriptionContainer>
              <FirmwareReleaseDescription releaseId={version} />
            </DescriptionContainer>
          )}
          {activeTab === "file" && (
            <Centered>
              <FullHeight
                style={{
                  width: "100%",
                  padding: 32,
                  maxWidth: "1200px",
                  maxHeight: "600px",
                }}
              >
                {firmwareUploadArea}
              </FullHeight>
            </Centered>
          )}
        </Container>
      </StepContentContainer>
      <StepControlsContainer>
        <DownloadFirmwareButton target={target} version={version}>
          Download .bin
        </DownloadFirmwareButton>
        <FlashButton
          disabled={!target || !version}
          onClick={() => {
            onNext?.();
          }}
        />
      </StepControlsContainer>
    </FullHeight>
  );
};

export default FirmwareStep;
