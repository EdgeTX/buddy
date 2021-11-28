import ky from "ky";
import React, { useEffect, useState } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import Layout from "./Layout";
import FlashingWizard from "./pages/flash/Wizard";
import SdcardWizard from "./pages/sdcard/Wizard";

const App: React.FC = () => {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/flash" element={<FlashingWizard />} />
          <Route path="/sdcard" element={<SdcardWizard />} />
          <Route path="*" element={<>Wow, first new app</>} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;
