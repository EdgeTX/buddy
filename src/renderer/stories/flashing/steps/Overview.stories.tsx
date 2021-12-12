import { MockedProvider } from "@apollo/client/testing";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import OverviewStep from "renderer/pages/flash/v2/OverviewStep";
import {
  deviceQuery,
  firmwareReleaseInfoQuery,
} from "renderer/stories/flashing/mocks";

export default {
  title: "Flashing/Steps/OverviewStep",
  component: OverviewStep,
};

export const withReleaseFirmware: React.FC = () => (
  <MemoryRouter initialEntries={["/?version=v2.5.0&target=nv-14&deviceId=1"]}>
    <MockedProvider mocks={[firmwareReleaseInfoQuery, deviceQuery]}>
      <OverviewStep stepIndex={3} />
    </MockedProvider>
  </MemoryRouter>
);
