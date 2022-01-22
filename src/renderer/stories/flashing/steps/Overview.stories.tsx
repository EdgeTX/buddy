import { MockedProvider } from "@apollo/client/testing";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import OverviewStep from "renderer/components/flash/steps/OverviewStep";
import {
  deviceQuery,
  firmwarePrBuildInfoQuery,
  firmwareReleaseInfoQuery,
} from "renderer/stories/flashing/mocks";
import { encodePrVersion } from "shared/tools";
import { examplePrs } from "test-utils/data";

export default {
  title: "Flashing/Steps/OverviewStep",
  component: OverviewStep,
};

export const withReleaseFirmware: React.FC = () => (
  <MemoryRouter initialEntries={["/?version=v2.5.0&target=nv-14&deviceId=1"]}>
    <MockedProvider mocks={[firmwareReleaseInfoQuery, deviceQuery]}>
      <OverviewStep wizardType="user" />
    </MockedProvider>
  </MemoryRouter>
);

export const withPrBuildFirmware: React.FC = () => (
  <MemoryRouter
    initialEntries={[
      `/?version=${encodePrVersion({
        prId: examplePrs[0]?.id,
        commitId: examplePrs[0]?.headCommitId,
      })!}&target=nv-14&deviceId=1`,
    ]}
  >
    <MockedProvider mocks={[firmwarePrBuildInfoQuery, deviceQuery]}>
      <OverviewStep wizardType="user" />
    </MockedProvider>
  </MemoryRouter>
);
