import { MockedProvider } from "@apollo/client/testing";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import FlashingWizard from "renderer/pages/flash/FlashingWizard";
import {
  devicesQuery,
  firmwareReleaseDescriptionQuery,
  firmwaresQuery,
  prBuildFirmwareDataQuery,
  prCommitBuildQuery,
  prCommitsQuery,
  prDescriptionQuery,
  prsQuery,
  targetsQuery,
} from "./mocks";

export default {
  title: "Flashing/Wizard",
  component: FlashingWizard,
};

export const usable: React.FC = () => (
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
        devicesQuery,
        prBuildFirmwareDataQuery,
      ]}
    >
      <FlashingWizard />
    </MockedProvider>
  </MemoryRouter>
);
