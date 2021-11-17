import ky from "ky";
import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { flash } from "./dfu";
import Layout from "./Layout";
import FlashingWizard from "./pages/flash/Wizard";

const useFirmware = (): Buffer | undefined => {
  const [buffer, setBuffer] = useState<Buffer>();

  useEffect(() => {
    ky.get("/nv14.bin").then(async (res) => {
      setBuffer(Buffer.from(await res.arrayBuffer()));
    });
  }, []);

  return buffer;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/flash" element={<FlashingWizard />} />
          <Route path="*" element={<>Wow, first new app</>} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

export default App;
