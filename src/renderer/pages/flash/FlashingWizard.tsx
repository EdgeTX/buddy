/**
 * TODO: add step index to the query params so
 * that navigation back and forth can be done with
 * native history
 */
import { Steps } from "antd";
import React, { useEffect } from "react";
import config from "shared/config";
import { Centered } from "renderer/shared/layouts";
import useQueryParams from "renderer/hooks/useQueryParams";
import useIsMobile from "renderer/hooks/useIsMobile";
import DeviceSelectionStep from "./steps/DeviceSelectionStep";
import FirmwareSelectionStep from "./steps/FirmwareSelectionStep";
import OverviewStep from "./steps/OverviewStep";

const { Step } = Steps;

const flashSteps = [
  {
    title: "Select a firmware",
    component: FirmwareSelectionStep,
  },
  {
    title: "Connect radio",
    component: DeviceSelectionStep,
  },
  {
    title: "Overview & flash",
    component: OverviewStep,
  },
];

type FlashStepComponent = typeof flashSteps[number]["component"];

const FlashingWizard: React.FC = () => {
  const { parseParam, updateParams } = useQueryParams<"step">();
  const current = parseParam("step", Number) ?? 1;
  const isMobile = useIsMobile();

  // If this page first renders, set the step back to 1
  useEffect(() => {
    updateParams({
      step: undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderComponent = (Component: FlashStepComponent): React.ReactNode => (
    <Component
      onNext={() => updateParams({ step: current + 1 }, true)}
      onPrevious={() => updateParams({ step: current - 1 }, true)}
      onRestart={() => updateParams({ step: undefined }, true)}
      variant={config.isElectron ? "electron" : "web"}
    />
  );

  return (
    <>
      <Centered>
        <Steps
          direction={isMobile ? "vertical" : "horizontal"}
          current={current - 1}
          progressDot={!isMobile}
          labelPlacement="vertical"
          style={{ maxWidth: "600px" }}
        >
          {flashSteps.map((item, stepNum) => (
            <Step
              key={item.title}
              title={item.title}
              description={
                stepNum + 1 === current &&
                isMobile &&
                renderComponent(item.component)
              }
            />
          ))}
        </Steps>
      </Centered>

      {!isMobile &&
        renderComponent(
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          flashSteps[current - 1]!.component
        )}
    </>
  );
};

export default FlashingWizard;
