import React from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import Layout from "./Layout";
import FlashingWizard from "./pages/flash/Wizard";

import FlashingExecution from "./pages/flash/Execution";
import SdcardWizard from "./pages/sdcard/Wizard";
import SdcardWriteExecution from "./pages/sdcard/Execution";

const App: React.FC = () => {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/flash" element={<FlashingWizard />} />
          <Route path="/flash/:jobId" element={<FlashingExecution />} />
          <Route path="/sdcard" element={<SdcardWizard />} />
          <Route path="/sdcard/:jobId" element={<SdcardWriteExecution />} />
          <Route path="*" element={<>Wow, first new app</>} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;
