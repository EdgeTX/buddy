import React, { useEffect, useState } from "react";
import { Tabs, Button, Divider, Typography, Tooltip } from "antd";
import {
  BranchesOutlined,
  RocketOutlined,
  UploadOutlined,
  UsbOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import useQueryParams from "renderer/hooks/useQueryParams";
import styled from "styled-components";

import { StepComponent } from "renderer/components/flash/types";
import {
  StepContentContainer,
  StepControlsContainer,
} from "renderer/components/flash/shared";
import { Centered, FullHeight } from "renderer/shared/layouts";
import useVersionFilters from "renderer/hooks/useVersionFilters";
import { decodePrVersion, isPrVersion } from "shared/tools";
import DownloadFirmwareButton from "renderer/components/flash/components/DownloadFirmwareButton";
import useIsMobile from "renderer/hooks/useIsMobile";
import { hasUsbApi } from "renderer/compatibility/checks";
import config from "shared/config";
import FirmwareReleasesPicker from "./firmware/FirmwareReleasesPicker";
import FirmwareReleaseDescription from "./firmware/FirmwareReleaseDescription";
import FirmwareUploader from "./firmware/FirmwareUploader";
import FirmwarePrBuildPicker from "./firmware/FirmwarePrBuildPicker";
import FirmwarePrDescription from "./firmware/FirmwarePrDescription";
import CopyUrlButton from "./firmware/CopyUrlButton";

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

const flashingAvailable = config.isElectron || hasUsbApi;

const FirmwareStep: StepComponent = ({ onNext, wizardType }) => {
  const isMobile = useIsMobile();
  const { parseParam, updateParams } = useQueryParams<
    "version" | "target" | "filters"
  >();
  const [activeTab, setActiveTab] = useState<string>(
    wizardType === "user" ? "releases" : "pr"
  );

  const version = parseParam("version");
  const target = parseParam("target");
  const { filters, encodeFilters } = useVersionFilters(parseParam("filters"));

  useEffect(() => {
    if (version === "local" && activeTab !== "file" && wizardType === "user") {
      setActiveTab("file");
    } else if (
      version &&
      isPrVersion(version) &&
      activeTab !== "pr" &&
      wizardType === "dev"
    ) {
      setActiveTab("pr");
    }
  }, [setActiveTab, version, activeTab, wizardType]);

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
            {wizardType === "user"
              ? [
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
                  </Tabs.TabPane>,
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
                              • These can be built locally or downloaded from
                              the EdgeTX releases
                            </Typography.Text>
                          </div>
                        </>
                      ) : (
                        firmwareUploadArea
                      )}
                    </div>
                  </Tabs.TabPane>,
                ]
              : [
                  <Tabs.TabPane
                    tab={
                      <span>
                        <BranchesOutlined />
                        PR Builds
                      </span>
                    }
                    key="pr"
                  >
                    <FirmwarePrBuildPicker
                      version={version}
                      target={target}
                      onChanged={(params) => {
                        if (activeTab === "pr") {
                          updateParams(params);
                        }
                      }}
                    />
                    <Divider />
                    <CopyUrlButton
                      basePath="/dev/flash"
                      target={target}
                      version={version}
                    />
                  </Tabs.TabPane>,
                ]}
          </Tabs>
          <Divider className="divider" type="vertical" />

          {activeTab === "releases" && (
            <DescriptionContainer>
              <FirmwareReleaseDescription releaseId={version} />
            </DescriptionContainer>
          )}
          {activeTab === "pr" &&
            (version && isPrVersion(version) ? (
              <DescriptionContainer>
                <FirmwarePrDescription prId={decodePrVersion(version).prId} />
              </DescriptionContainer>
            ) : (
              <Centered>
                <Typography.Title level={4} type="secondary">
                  Pull Request description
                </Typography.Title>
              </Centered>
            ))}
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
        <Tooltip
          trigger={!flashingAvailable ? ["hover", "click"] : []}
          placement="top"
          title="Not supported by your browser"
        >
          <Button
            disabled={!target || !version || !flashingAvailable}
            type="primary"
            icon={flashingAvailable ? <UsbOutlined /> : <WarningOutlined />}
            onClick={() => {
              if (target && version) {
                onNext?.();
              }
            }}
          >
            Flash via USB
          </Button>
        </Tooltip>
      </StepControlsContainer>
    </FullHeight>
  );
};

export default FirmwareStep;
