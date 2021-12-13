/**
 * TODO: add step index to the query params so
 * that navigation back and forth can be done with
 * native history
 */
import { Steps } from "antd";
import React, { useState } from "react";
import config from "shared/config";
import DeviceSelectionStep from "./steps/DeviceSelectionStep";
import FirmwareSelectionStep from "./steps/FirmwareSelectionStep";
import OverviewStep from "./steps/OverviewStep";
import { Centered } from "./shared";

const { Step } = Steps;

const flashSteps = [
  {
    title: "Select a firmware",
    component: FirmwareSelectionStep,
  },
  {
    title: "Choose device",
    component: DeviceSelectionStep,
  },
  {
    title: "Overview",
    component: OverviewStep,
  },
];

const FlashingWizard: React.FC = () => {
  const [current, setCurrent] = useState<number>(0);

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const Component = flashSteps[current]!.component;

  return (
    <>
      <Centered>
        <Steps
          current={current}
          progressDot
          labelPlacement="vertical"
          style={{ maxWidth: "600px" }}
        >
          {flashSteps.map((item) => (
            <Step key={item.title} title={item.title} />
          ))}
        </Steps>
      </Centered>

      <Component
        stepIndex={current}
        onNext={() => setCurrent((index) => index + 1)}
        onPrevious={() => setCurrent((index) => index - 1)}
        onRestart={() => setCurrent(0)}
        variant={config.isElectron ? "electron" : "web"}
      />
    </>
  );
};

export default FlashingWizard;
