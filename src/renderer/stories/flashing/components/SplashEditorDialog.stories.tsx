import { MockedProvider } from "@apollo/client/testing";
import { gql } from "@apollo/client";
import React from "react";
import SplashEditorDialog from "renderer/components/splash/SplashEditorDialog";

export default {
  title: "Flashing/Components/SplashEditorDialog",
  component: SplashEditorDialog,
};

const firmwareInfoQuery = gql`
  query SplashEditorFirmwareInfo($firmwareId: ID!) {
    firmwareSplashInfo(firmwareId: $firmwareId) {
      format
      width
      height
      maxBytes
      currentSplashBase64
    }
  }
`;

export const monoLocalFirmware: React.FC = () => (
  <MockedProvider
    mocks={[
      {
        request: {
          query: firmwareInfoQuery,
          variables: { firmwareId: "local-firmware-id" },
        },
        result: {
          data: {
            firmwareSplashInfo: {
              format: "mono-128x64",
              width: 128,
              height: 64,
              maxBytes: 1024,
              currentSplashBase64: null,
            },
          },
        },
      },
    ]}
  >
    <SplashEditorDialog
      target="local-firmware-id"
      allowApplyAndContinue
      onClose={() => {}}
      onApplied={() => {}}
    />
  </MockedProvider>
);

export const grayscaleCloudFirmware: React.FC = () => (
  <MockedProvider
    mocks={[
      {
        request: {
          query: firmwareInfoQuery,
          variables: { firmwareId: "cloud-firmware-id" },
        },
        result: {
          data: {
            firmwareSplashInfo: {
              format: "grayscale-212x64",
              width: 212,
              height: 64,
              maxBytes: 3070,
              currentSplashBase64: null,
            },
          },
        },
      },
    ]}
  >
    <SplashEditorDialog
      target="cloud-firmware-id"
      allowApplyAndContinue={false}
      onClose={() => {}}
      onApplied={() => {}}
    />
  </MockedProvider>
);
