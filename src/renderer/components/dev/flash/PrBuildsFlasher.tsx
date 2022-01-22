import { Divider, Space, Card } from "antd";
import React from "react";
import DownloadFirmwareButton from "renderer/components/flash/components/DownloadFirmwareButton";
import DeviceSelector from "renderer/components/flash/steps/device/DeviceSelector";
import CopyUrlButton from "renderer/components/flash/steps/firmware/CopyUrlButton";
import FirmwarePrBuildPicker from "renderer/components/flash/steps/firmware/FirmwarePrBuildPicker";
import FlashButton from "renderer/components/flash/steps/firmware/FlashButton";
import useQueryParams from "renderer/hooks/useQueryParams";
import { FullHeight } from "renderer/shared/layouts";
import config from "shared/config";
import styled from "styled-components";

const Container = styled.div`
  display: flex;
  height: 100%;
  padding: 32px;
  > * {
    flex: 1;
    padding: 8px;
  }
`;

const PrBuildsFlasher: React.FC = () => {
  const { parseParam, updateParams } = useQueryParams();

  const version = parseParam("version");
  const target = parseParam("target");
  const selectedDeviceId = parseParam("deviceId");

  return (
    <FullHeight>
      <Container>
        <div style={{ maxWidth: "400px" }}>
          <Card style={{ height: "100%" }}>
            <FirmwarePrBuildPicker
              version={version}
              target={target}
              onChanged={(params) => {
                updateParams(params);
              }}
            />
            <Divider />
            <CopyUrlButton
              basePath="/dev/flash"
              target={target}
              version={version}
            />
          </Card>
        </div>
        <DeviceSelector
          selectedDeviceId={selectedDeviceId}
          onChange={(deviceId) => {
            updateParams({ deviceId });
          }}
          variant={config.isElectron ? "electron" : "web"}
        />
      </Container>
      <div>
        <Space size="small">
          <DownloadFirmwareButton target={target} version={version}>
            Download .bin
          </DownloadFirmwareButton>
          <FlashButton
            disabled={!target || !version || !selectedDeviceId}
            onClick={() => {
              console.log("Flash!", target, version);
            }}
          />
        </Space>
      </div>
    </FullHeight>
  );
};

export default PrBuildsFlasher;
