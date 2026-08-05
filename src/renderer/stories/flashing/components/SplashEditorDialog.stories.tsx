import { MockedProvider } from "@apollo/client/testing";
import React from "react";
import SplashEditorDialog from "renderer/components/splash/SplashEditorDialog";

export default {
  title: "Flashing/Components/SplashEditorDialog",
  component: SplashEditorDialog,
};

export const monoLocalFirmware: React.FC = () => (
  <MockedProvider>
    <SplashEditorDialog
      isLocal
      target="local-firmware-id"
      capability={{
        format: "mono-128x64",
        width: 128,
        height: 64,
        maxBytes: 1024,
      }}
      onClose={() => {}}
      onApplied={() => {}}
    />
  </MockedProvider>
);

export const grayscaleCloudFirmware: React.FC = () => (
  <MockedProvider>
    <SplashEditorDialog
      isLocal={false}
      version="v2.12.2"
      target="x9dp2019"
      capability={{
        format: "grayscale-212x64",
        width: 212,
        height: 64,
        maxBytes: 3070,
      }}
      onClose={() => {}}
      onApplied={() => {}}
    />
  </MockedProvider>
);
