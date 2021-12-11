import { MockedProvider } from "@apollo/client/testing";
import React from "react";
import FirmwareReleaseDescription from "renderer/pages/flash/v2/components/FirmwareReleaseDescription";

import { firmwareReleaseDescriptionQuery } from "renderer/stories/flashing/mocks";

export default {
  title: "Flashing/Firmware Selection/FirmwareReleaseDescription",
  component: FirmwareReleaseDescription,
};

export const releaseSelected: React.FC = () => (
  <MockedProvider mocks={[firmwareReleaseDescriptionQuery]}>
    <div style={{ height: "100%", overflowY: "scroll" }}>
      <FirmwareReleaseDescription releaseId="v2.5.0" />
    </div>
  </MockedProvider>
);

export const releaseDescriptionNotAvailable: React.FC = () => (
  <MockedProvider mocks={[firmwareReleaseDescriptionQuery]}>
    <FirmwareReleaseDescription releaseId="v2.5.1" />
  </MockedProvider>
);
