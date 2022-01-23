import { MockedProvider } from "@apollo/client/testing";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import PrBuildsFlasher from "renderer/pages/dev/flash/PrBuildsFlasher";
import {
  devicesQuery,
  prCommitBuildQuery,
  prCommitsQuery,
  prsQuery,
} from "renderer/stories/flashing/mocks";

export default {
  title: "Flashing/dev/PR Builds/PrBuildsFlasher",
  component: PrBuildsFlasher,
};

export const usable: React.FC = () => (
  <MemoryRouter>
    <MockedProvider
      mocks={[prsQuery, prCommitsQuery, prCommitBuildQuery, devicesQuery]}
    >
      <PrBuildsFlasher />
    </MockedProvider>
  </MemoryRouter>
);
