import { Steps } from "antd";
import React, { useState } from "react";
import FirmwareStep from "./FirmwareStep";
import { Centered } from "./shared";
import { StepComponent } from "./types";

const { Step } = Steps;

const DummyStep: StepComponent = ({ stepIndex }) => (
  <div>Content {stepIndex}</div>
);

const flashSteps = [
  {
    title: "Select a firmware",
    component: FirmwareStep,
  },
  {
    title: "Choose device",
    component: DummyStep,
  },
  {
    title: "Confirm",
    component: DummyStep,
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
      />
    </>
  );
};

export default FlashingWizard;
