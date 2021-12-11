import React from "react";

// eslint-disable-next-line @typescript-eslint/ban-types
export type StepComponent<P = {}> = React.FC<
  {
    onNext?: () => void;
    onPrevious?: () => void;
    onRestart?: () => void;
    stepIndex: number;
  } & P
>;

export type Device = {
  id: string;
  productName?: string | null;
  serialNumber?: string | null;
  vendorId: string;
  productId: string;
};
