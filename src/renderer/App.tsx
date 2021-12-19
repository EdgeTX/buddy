import React from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./Layout";
import FlashingWizard from "./pages/flash/FlashingWizard";
import FlashExecution from "./pages/flash/FlashExecution";
import SdcardWizard from "./pages/sdcard/Wizard";
import SdcardWriteExecution from "./pages/sdcard/Execution";
import SdcardEditor from "./pages/sdcardv2/SdcardEditor";
import SelectSdcardScreen from "./pages/sdcardv2/SelectSdcardScreen";

const NextGeneration: React.FC = () => (
  <HashRouter>
    <Layout>
      <Routes>
        <Route path="/flash" element={<FlashingWizard />} />
        <Route path="/flash/:jobId" element={<FlashExecution />} />
        <Route path="/sdcard" element={<SelectSdcardScreen />} />
        <Route path="/sdcard/:directoryId" element={<SdcardEditor />} />
        <Route path="/sdcard/:directoryId/:tab" element={<SdcardEditor />} />

        <Route path="/sdcardv1" element={<SdcardWizard />} />
        <Route path="/sdcardv1/:jobId" element={<SdcardWriteExecution />} />
        <Route path="*" element={<Navigate replace to="/flash" />} />
      </Routes>
    </Layout>
  </HashRouter>
);

export default NextGeneration;
