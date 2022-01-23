import React from "react";

// eslint-disable-next-line @typescript-eslint/ban-types
export type StepComponent<P = {}> = React.FC<
  {
    onNext?: () => void;
    onPrevious?: () => void;
    onRestart?: () => void;
  } & P
>;
