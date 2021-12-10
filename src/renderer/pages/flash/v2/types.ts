import React from "react";

export type StepComponent = React.FC<{
  onNext?: () => void;
  onPrevious?: () => void;
  stepIndex: number;
}>;
