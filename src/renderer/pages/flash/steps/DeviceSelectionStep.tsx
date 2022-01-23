import { Button } from "antd";
import React from "react";
import useQueryParams from "renderer/hooks/useQueryParams";
import {
  StepContentContainer,
  StepControlsContainer,
} from "renderer/pages/flash/shared";
import { FullHeight } from "renderer/shared/layouts";
import { StepComponent } from "renderer/pages/flash/types";
import DeviceSelector from "renderer/components/devices/DeviceSelector";
import config from "shared/config";

const DeviceSelectionStep: StepComponent = ({ onNext, onPrevious }) => {
  const { parseParam, updateParams } = useQueryParams<"deviceId">();
  const selectedDeviceId = parseParam("deviceId");

  return (
    <FullHeight>
      <StepContentContainer>
        <DeviceSelector
          selectedDeviceId={selectedDeviceId}
          onChange={(newDeviceId) => {
            updateParams({ deviceId: newDeviceId });
          }}
          variant={config.isElectron ? "electron" : "web"}
        />
      </StepContentContainer>
      <StepControlsContainer>
        <Button
          onClick={() => {
            onPrevious?.();
          }}
        >
          Go back
        </Button>
        <Button
          type="primary"
          disabled={!selectedDeviceId}
          onClick={() => {
            if (selectedDeviceId) {
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

export default DeviceSelectionStep;
