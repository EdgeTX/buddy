import { MockedProvider } from "@apollo/client/testing";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import FlashingWizard from "renderer/pages/flash/v2/FlashingWizard";
import { firmwaresQuery, targetsQuery } from "./mocks";

export default {
  title: "Flashing/Wizard",
  component: FlashingWizard,
};

export const usable: React.FC = () => (
  <MemoryRouter>
    <MockedProvider mocks={[firmwaresQuery, targetsQuery]}>
      <FlashingWizard />
    </MockedProvider>
  </MemoryRouter>
);
