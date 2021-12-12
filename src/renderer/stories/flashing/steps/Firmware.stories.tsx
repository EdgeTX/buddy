import { MockedProvider } from "@apollo/client/testing";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import FirmwareStep from "renderer/pages/flash/FirmwareStep";
import {
  firmwaresQuery,
  targetsQuery,
  firmwareReleaseDescriptionQuery,
} from "renderer/stories/flashing/mocks";

export default {
  title: "Flashing/Steps/FirmwareStep",
  component: FirmwareStep,
};

export const initialRender = () => (
  <MemoryRouter>
    <MockedProvider
      mocks={[firmwaresQuery, targetsQuery, firmwareReleaseDescriptionQuery]}
    >
      <FirmwareStep stepIndex={0} />
    </MockedProvider>
  </MemoryRouter>
);
