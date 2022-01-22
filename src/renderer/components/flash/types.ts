import React from "react";

// eslint-disable-next-line @typescript-eslint/ban-types
export type StepComponent<P = {}> = React.FC<
  {
    wizardType: "user" | "dev";
    onNext?: () => void;
    onPrevious?: () => void;
    onRestart?: () => void;
  } & P
>;

export type Device = {
  id: string;
  productName?: string | null;
  serialNumber?: string | null;
  vendorId: string;
  productId: string;
};
