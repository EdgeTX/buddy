import { Button } from "antd";
import React from "react";
import useQueryParams from "renderer/hooks/useQueryParams";
import {
  StepContentContainer,
  StepControlsContainer,
} from "renderer/components/flash/shared";
import { FullHeight } from "renderer/shared/layouts";
import { StepComponent } from "renderer/components/flash/types";
import DeviceSelector from "./device/DeviceSelector";

const DeviceSelectionStep: StepComponent<{
  variant: "web" | "electron";
}> = ({ variant, onNext, onPrevious }) => {
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
          variant={variant}
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
