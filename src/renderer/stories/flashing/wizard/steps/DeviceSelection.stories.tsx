import { MockedProvider } from "@apollo/client/testing";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import DeviceSelectionStep from "renderer/pages/flash/steps/DeviceSelectionStep";
import { devicesQuery } from "test-utils/mocks";

export default {
  title: "Flashing/wizard/Steps/DeviceSelectionStep",
  component: DeviceSelectionStep,
};

export const devices: React.FC = () => (
  <MemoryRouter>
    <MockedProvider mocks={[devicesQuery]}>
      <DeviceSelectionStep />
    </MockedProvider>
  </MemoryRouter>
);

export const noDevices: React.FC = () => (
  <MemoryRouter>
    <MockedProvider mocks={[]}>
      <DeviceSelectionStep />
    </MockedProvider>
  </MemoryRouter>
);
