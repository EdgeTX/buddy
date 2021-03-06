/**
 * TODO: add step index to the query params so
 * that navigation back and forth can be done with
 * native history
 */
import { Steps } from "antd";
import React, { useEffect } from "react";
import { Centered } from "renderer/shared/layouts";
import useQueryParams from "renderer/hooks/useQueryParams";
import useIsMobile from "renderer/hooks/useIsMobile";
import { useTranslation } from "react-i18next";
import DeviceSelectionStep from "./steps/DeviceSelectionStep";
import FirmwareSelectionStep from "./steps/FirmwareSelectionStep";
import OverviewStep from "./steps/OverviewStep";
import { StepComponent } from "./types";

const { Step } = Steps;

const FlashingWizard: React.FC = () => {
  const { t } = useTranslation("flashing");
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

  const renderComponent = (Component: StepComponent): React.ReactNode => (
    <Component
      onNext={() => updateParams({ step: current + 1 }, true)}
      onPrevious={() => updateParams({ step: current - 1 }, true)}
      onRestart={() => updateParams({ step: undefined }, true)}
    />
  );

  const steps = [
    {
      title: t(`Select a firmware`),
      component: FirmwareSelectionStep,
    },
    {
      title: t(`Connect radio`),
      component: DeviceSelectionStep,
    },
    {
      title: t(`Overview & flash`),
      component: OverviewStep,
    },
  ];

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
          {steps.map((item, stepNum) => (
            <Step
              key={item.title}
              title={item.title}
              data-testid={`step-indicator-${stepNum}`}
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
          steps[current - 1]!.component
        )}
    </>
  );
};

export default FlashingWizard;
