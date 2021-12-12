import React from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./Layout";
import FlashingWizard from "./pages/flash/v2/FlashingWizard";
import FlashExecution from "./pages/flash/v2/FlashExecution";
import SdcardWizard from "./pages/sdcard/Wizard";
import SdcardWriteExecution from "./pages/sdcard/Execution";

const NextGeneration: React.FC = () => (
  <HashRouter>
    <Layout>
      <Routes>
        <Route path="/flash" element={<FlashingWizard />} />
        <Route path="/flash/:jobId" element={<FlashExecution />} />
        <Route path="/sdcard" element={<SdcardWizard />} />
        <Route path="/sdcard/:jobId" element={<SdcardWriteExecution />} />
        <Route path="*" element={<Navigate replace to="/flash" />} />
      </Routes>
    </Layout>
  </HashRouter>
);

export default NextGeneration;
