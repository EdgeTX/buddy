import ky from "ky";
import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./Layout";
import FlashingWizard from "./pages/flash/Wizard";
import SdcardWizard from "./pages/sdcard/Wizard";

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/flash" element={<FlashingWizard />} />
          <Route path="/sdcard" element={<SdcardWizard />} />
          <Route path="*" element={<>Wow, first new app</>} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

export default App;
