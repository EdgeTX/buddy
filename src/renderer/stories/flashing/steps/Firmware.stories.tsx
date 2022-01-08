import { MockedProvider } from "@apollo/client/testing";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import FirmwareSelectionStep from "renderer/pages/flash/steps/FirmwareSelectionStep";
import {
  firmwaresQuery,
  targetsQuery,
  firmwareReleaseDescriptionQuery,
  prCommitBuildQuery,
  prsQuery,
  prDescriptionQuery,
  prCommitsQuery,
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
      ]}
    >
      <FirmwareSelectionStep />
    </MockedProvider>
  </MemoryRouter>
);
