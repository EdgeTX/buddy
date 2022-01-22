import { MockedProvider } from "@apollo/client/testing";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import FirmwareSelectionStep from "renderer/components/flash/steps/FirmwareSelectionStep";
import {
  firmwaresQuery,
  targetsQuery,
  firmwareReleaseDescriptionQuery,
  prCommitBuildQuery,
  prsQuery,
  prDescriptionQuery,
  prCommitsQuery,
  prBuildFirmwareDataQuery,
} from "renderer/stories/flashing/mocks";

export default {
  title: "Flashing/Steps/FirmwareSelectionStep",
  component: FirmwareSelectionStep,
};

export const initialRender = () => (
  <MemoryRouter>
    <MockedProvider
      mocks={[
        firmwaresQuery,
        targetsQuery,
        firmwareReleaseDescriptionQuery,
        prCommitBuildQuery,
        prsQuery,
        prDescriptionQuery,
        prCommitsQuery,
        prBuildFirmwareDataQuery,
      ]}
    >
      <FirmwareSelectionStep wizardType="user" />
    </MockedProvider>
  </MemoryRouter>
);

export const dev = () => (
  <MemoryRouter>
    <MockedProvider
      mocks={[
        firmwaresQuery,
        targetsQuery,
        firmwareReleaseDescriptionQuery,
        prCommitBuildQuery,
        prsQuery,
        prDescriptionQuery,
        prCommitsQuery,
        prBuildFirmwareDataQuery,
      ]}
    >
      <FirmwareSelectionStep wizardType="dev" />
    </MockedProvider>
  </MemoryRouter>
);
