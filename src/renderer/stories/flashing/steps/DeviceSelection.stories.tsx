import { MockedProvider } from "@apollo/client/testing";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import DeviceSelectionStep from "renderer/pages/flash/DeviceSelectionStep";
import { devicesQuery } from "renderer/stories/flashing/mocks";

export default {
  title: "Flashing/Steps/DeviceSelectionStep",
  component: DeviceSelectionStep,
};

export const web: React.FC = () => (
  <MemoryRouter>
    <MockedProvider mocks={[devicesQuery]}>
      <DeviceSelectionStep variant="web" stepIndex={1} />
    </MockedProvider>
  </MemoryRouter>
);

export const electron: React.FC = () => (
  <MemoryRouter>
    <MockedProvider mocks={[devicesQuery]}>
      <DeviceSelectionStep variant="electron" stepIndex={1} />
    </MockedProvider>
  </MemoryRouter>
);

export const webNoDevices: React.FC = () => (
  <MemoryRouter>
    <MockedProvider mocks={[]}>
      <DeviceSelectionStep variant="web" stepIndex={1} />
    </MockedProvider>
  </MemoryRouter>
);

export const electronNoDevices: React.FC = () => (
  <MemoryRouter>
    <MockedProvider mocks={[]}>
      <DeviceSelectionStep variant="electron" stepIndex={1} />
    </MockedProvider>
  </MemoryRouter>
);
