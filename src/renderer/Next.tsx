import "antd/dist/antd.variable.min.css";
import React from "react";
import { HashRouter } from "react-router-dom";
import FirmwareStep from "./pages/flash/v2/FirmwareStep";

const NextGeneration: React.FC = () => (
  <HashRouter>
    <FirmwareStep />
  </HashRouter>
);

export default NextGeneration;
