import React from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import isMobile from "is-mobile";
import environment from "shared/environment";
import Layout from "./Layout";
import FlashingWizard from "./pages/flash/FlashingWizard";
import FlashExecution from "./pages/flash/FlashExecution";
import BackupScreen from "./pages/backup/BackupScreen";
import SdcardEditor from "./pages/sdcard/SdcardEditor";
import SelectSdcardScreen from "./pages/sdcard/SelectSdcardScreen";
import CompatNoticeHandler from "./compatibility/CompatNoticeHandler";
import DevTools from "./pages/dev/DevTools";
import { RouteTracker } from "./tracking";

const isMobileOs = isMobile({ tablet: true });

const App: React.FC = () => (
  <HashRouter>
    {!environment.isElectron && !isMobileOs && <CompatNoticeHandler />}
    <RouteTracker />
    <Layout
      macFrameless={environment.isElectron && environment.os === "Mac OS"}
      windowsFrameless={
        environment.isElectron && !!environment.os?.startsWith("Windows")
      }
    >
      <Routes>
        <Route path="/flash" element={<FlashingWizard />} />
        <Route path="/flash/:jobId" element={<FlashExecution />} />
        <Route path="/backup" element={<BackupScreen />} />
        <Route path="/dev/*" element={<DevTools route="/dev/" />} />
        <Route path="/sdcard" element={<SelectSdcardScreen />} />
        <Route path="/sdcard/:directoryId" element={<SdcardEditor />} />
        <Route path="/sdcard/:directoryId/:tab" element={<SdcardEditor />} />
        <Route path="*" element={<Navigate replace to="/flash" />} />
      </Routes>
    </Layout>
  </HashRouter>
);

export default App;
