import { Divider, Space, message } from "antd";
import React, { useEffect } from "react";
import DownloadFirmwareButton from "renderer/components/flash/components/DownloadFirmwareButton";
import DeviceSelector from "renderer/components/flash/steps/device/DeviceSelector";
import CopyUrlButton from "renderer/components/flash/steps/firmware/CopyUrlButton";
import FirmwarePrBuildPicker from "renderer/components/flash/steps/firmware/FirmwarePrBuildPicker";
import FlashButton from "renderer/components/flash/steps/firmware/FlashButton";
import useQueryParams from "renderer/hooks/useQueryParams";
import useCreateFlashJob from "renderer/hooks/useCreateFlashJob";
import { FullHeight } from "renderer/shared/layouts";
import config from "shared/config";
import styled from "styled-components";
import useCancelFlashJob from "renderer/hooks/useCancelFlashJob";
import ExecutionOverlay from "./ExecuationOverlay";

const Container = styled.div`
  display: flex;
  height: 100%;
  > * {
    display: flex;
    justify-content: center;
    flex: 1;
    padding: 16px;
  }
`;

const PrBuildsFlasher: React.FC = () => {
  const { parseParam, updateParams } = useQueryParams();

  const version = parseParam("version");
  const target = parseParam("target");
  const selectedDeviceId = parseParam("deviceId");
  const flashJobId = parseParam("flashJob");

  const [createFlashJob, { loading: creatingJob }] = useCreateFlashJob();
  const cancelJob = useCancelFlashJob(flashJobId);

  useEffect(() => {
    if (flashJobId) {
      return () => {
        void cancelJob();
      };
    }
    return undefined;
  }, [flashJobId, cancelJob]);

  return (
    <ExecutionOverlay
      onClose={() => {
        updateParams({ flashJob: undefined });
      }}
      jobId={flashJobId}
    >
      <FullHeight>
        <Container>
          <FullHeight style={{ alignItems: "center" }}>
            <div
              style={{
                maxWidth: "300px",
                width: "100%",
                height: "100%",
              }}
            >
              <FirmwarePrBuildPicker
                version={version}
                target={target}
                onChanged={(params) => {
                  updateParams(params);
                }}
              />
              <Divider />
              <CopyUrlButton target={target} version={version} />
            </div>
          </FullHeight>
          <DeviceSelector
            selectedDeviceId={selectedDeviceId}
            onChange={(deviceId) => {
              updateParams({ deviceId });
            }}
            variant={config.isElectron ? "electron" : "web"}
          />
        </Container>
        <div
          style={{
            paddingTop: "32px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Space size="small">
            <DownloadFirmwareButton target={target} version={version}>
              Download .bin
            </DownloadFirmwareButton>
            <FlashButton
              loading={creatingJob}
              disabled={
                !target || !version || !selectedDeviceId || !!flashJobId
              }
              onClick={() => {
                if (!target || !version || !selectedDeviceId) {
                  return;
                }

                createFlashJob({
                  firmware: { target, version },
                  deviceId: selectedDeviceId,
                })
                  .then((jobId) => {
                    updateParams({ flashJob: jobId });
                  })
                  .catch((e: Error) => {
                    void message.error(`Could not create job: ${e.message}`);
                  });
              }}
            />
          </Space>
        </div>
      </FullHeight>
    </ExecutionOverlay>
  );
};

export default PrBuildsFlasher;
