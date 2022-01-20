import React from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import config from "shared/config";
import isMobile from "is-mobile";
import Layout from "./Layout";
import FlashingWizard from "./pages/flash/FlashingWizard";
import FlashExecution from "./pages/flash/FlashExecution";
import SdcardEditor from "./pages/sdcard/SdcardEditor";
import SelectSdcardScreen from "./pages/sdcard/SelectSdcardScreen";
import CompatNoticeHandler from "./compatibility/CompatNoticeHandler";

const isMobileOs = isMobile({ tablet: true });

const NextGeneration: React.FC = () => (
  <HashRouter>
    {!config.isElectron && !isMobileOs && <CompatNoticeHandler />}
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
