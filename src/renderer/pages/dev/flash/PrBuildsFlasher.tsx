import { Divider, Space, message } from "antd";
import React, { useEffect } from "react";
import DownloadFirmwareButton from "renderer/components/firmware/DownloadFirmwareButton";
import DeviceSelector from "renderer/components/devices/DeviceSelector";
import CopyUrlButton from "renderer/components/firmware/CopyUrlButton";
import FirmwarePrBuildPicker from "renderer/pages/dev/flash/components/FirmwarePrBuildPicker";
import FlashButton from "renderer/components/flashing/FlashButton";
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

const PrOptionsContainer = styled.div`
  max-width: 300px;
  width: 100%;
`;

const Controls = styled.div`
  display: flex;
  justify-content: center;
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
          <DeviceSelector
            selectedDeviceId={selectedDeviceId}
            onChange={(deviceId) => {
              updateParams({ deviceId });
            }}
            variant={config.isElectron ? "electron" : "web"}
          />
          <FullHeight style={{ alignItems: "center" }}>
            <PrOptionsContainer>
              <FirmwarePrBuildPicker
                version={version}
                target={target}
                onChanged={(params) => {
                  updateParams(params);
                }}
              />
              <Divider />
              <CopyUrlButton target={target} version={version} />
            </PrOptionsContainer>
          </FullHeight>
        </Container>
        <Controls>
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
        </Controls>
      </FullHeight>
    </ExecutionOverlay>
  );
};

export default PrBuildsFlasher;
