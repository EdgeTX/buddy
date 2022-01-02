import React from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import config from "shared/config";
import Layout from "./Layout";
import FlashingWizard from "./pages/flash/FlashingWizard";
import FlashExecution from "./pages/flash/FlashExecution";
import SdcardEditor from "./pages/sdcard/SdcardEditor";
import SelectSdcardScreen from "./pages/sdcard/SelectSdcardScreen";
import WebCompatInfo from "./WebCompatInfo";

// eslint-disable-next-line @typescript-eslint/prefer-optional-chain,@typescript-eslint/no-unnecessary-condition
const hasUsbApi = !!(navigator.usb && navigator.usb.requestDevice) as boolean;
const hasFilesystemApi = !!window.showDirectoryPicker as boolean;

const NextGeneration: React.FC = () => (
  <HashRouter>
    {!config.isElectron && (!hasUsbApi || !hasFilesystemApi) && (
      <WebCompatInfo
        missingFilesystemApi={!hasFilesystemApi}
        missingUsbApi={!hasUsbApi}
      />
    )}
    <Layout
      macFrameless={config.isElectron && config.os === "Mac OS"}
      windowsFrameless={config.isElectron && !!config.os?.startsWith("Windows")}
    >
      <Routes>
        <Route path="/flash" element={<FlashingWizard />} />
        <Route path="/flash/:jobId" element={<FlashExecution />} />
        <Route path="/sdcard" element={<SelectSdcardScreen />} />
        <Route path="/sdcard/:directoryId" element={<SdcardEditor />} />
        <Route path="/sdcard/:directoryId/:tab" element={<SdcardEditor />} />
        <Route path="*" element={<Navigate replace to="/flash" />} />
      </Routes>
    </Layout>
  </HashRouter>
);

export default NextGeneration;
