import { MockedProvider } from "@apollo/client/testing";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import FirmwareStep from "renderer/pages/flash/v2/FirmwareStep";
import { firmwaresQuery, targetsQuery } from "renderer/stories/flashing/mocks";

export default {
  title: "Flashing/Steps/FirmwareStep",
  component: FirmwareStep,
};

export const initialRender = () => (
  <MemoryRouter>
    <MockedProvider mocks={[firmwaresQuery, targetsQuery]}>
      <FirmwareStep />
    </MockedProvider>
  </MemoryRouter>
);
