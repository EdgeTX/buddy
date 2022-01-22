import { MockedProvider } from "@apollo/client/testing";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import Layout from "renderer/Layout";
import FirmwareReleaseDescription from "renderer/components/flash/steps/firmware/FirmwareReleaseDescription";

import { firmwareReleaseDescriptionQuery } from "renderer/stories/flashing/mocks";

export default {
  title: "Flashing/steps/Firmware Selection/FirmwareReleaseDescription",
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

export const contained: React.FC = () => (
  <MockedProvider mocks={[firmwareReleaseDescriptionQuery]}>
    <MemoryRouter>
      <Layout>
        <div
          style={{ display: "flex", flexDirection: "column", height: "100%" }}
        >
          <div style={{ height: "100%", overflowY: "auto" }}>
            <FirmwareReleaseDescription releaseId="v2.5.0" />
          </div>
          <div>some text</div>
        </div>
      </Layout>
    </MemoryRouter>
  </MockedProvider>
);
