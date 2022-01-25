import { MockedProvider } from "@apollo/client/testing";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import DeviceSelector from "renderer/components/devices/DeviceSelector";
import { devicesQuery } from "test-utils/mocks";

export default {
  title: "Flashing/components/DeviceSelector",
  component: DeviceSelector,
};

export const web: React.FC = () => (
  <MemoryRouter>
    <MockedProvider mocks={[devicesQuery]}>
      <DeviceSelector variant="web" />
    </MockedProvider>
  </MemoryRouter>
);

export const electron: React.FC = () => (
  <MemoryRouter>
    <MockedProvider mocks={[devicesQuery]}>
      <DeviceSelector variant="electron" />
    </MockedProvider>
  </MemoryRouter>
);

export const webNoDevices: React.FC = () => (
  <MemoryRouter>
    <MockedProvider mocks={[]}>
      <DeviceSelector variant="web" />
    </MockedProvider>
  </MemoryRouter>
);

export const electronNoDevices: React.FC = () => (
  <MemoryRouter>
    <MockedProvider mocks={[]}>
      <DeviceSelector variant="electron" />
    </MockedProvider>
  </MemoryRouter>
);
