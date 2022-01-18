import React, { useEffect, useState } from "react";
import {
  Tabs,
  Button,
  Divider,
  Typography,
  Dropdown,
  Menu,
  Tooltip,
} from "antd";
import {
  BranchesOutlined,
  EllipsisOutlined,
  RocketOutlined,
  UploadOutlined,
  UsbOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import useQueryParams from "renderer/hooks/useQueryParams";
import styled from "styled-components";

import { StepComponent } from "renderer/pages/flash/types";
import {
  StepContentContainer,
  StepControlsContainer,
} from "renderer/pages/flash/shared";
import { Centered, FullHeight } from "renderer/shared/layouts";
import useVersionFilters from "renderer/hooks/useVersionFilters";
import { decodePrVersion, isPrVersion } from "shared/tools";
import DownloadFirmwareButton from "renderer/pages/flash/components/DownloadFirmwareButton";
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
    } else if (version && isPrVersion(version) && activeTab !== "pr") {
      setActiveTab("pr");
    }
  }, [setActiveTab, version, activeTab]);

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
            tabBarExtraContent={
              !isMobile && (
                <Dropdown
                  placement="bottomRight"
                  trigger={["click"]}
                  overlay={
                    <Menu
                      onClick={(item) => {
                        updateParams({
                          version: undefined,
                          target: undefined,
                        });
                        setActiveTab(item.key);
                      }}
                      selectedKeys={[activeTab]}
                    >
                      <Menu.Item key="pr" icon={<BranchesOutlined />}>
                        PR Builds
                      </Menu.Item>
                    </Menu>
                  }
                >
                  <Button
                    type="text"
                    style={
                      ["pr"].includes(activeTab)
                        ? {
                            color: "var(--ant-primary-color)",
                            borderColor: "var(--ant-primary-color)",
                          }
                        : undefined
                    }
                  >
                    <EllipsisOutlined />
                  </Button>
                </Dropdown>
              )
            }
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
                {!target && (
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
                )}
              </div>
            </Tabs.TabPane>
            <Tabs.TabPane key="pr">
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
              <CopyUrlButton target={target} version={version} />
            </Tabs.TabPane>
          </Tabs>
          <Divider className="divider" type="vertical" />

          {activeTab === "releases" &&
            (version ? (
              <DescriptionContainer>
                <FirmwareReleaseDescription releaseId={version} />
              </DescriptionContainer>
            ) : (
              <Centered>
                <Typography.Title level={4} type="secondary">
                  Release notes
                </Typography.Title>
              </Centered>
            ))}
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
          trigger={!flashingAvailable ? ["hover"] : []}
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
