import "antd/dist/antd.variable.min.css";
import React from "react";
import FirmwareReleasePicker from "./components/FirmwareReleasesPicker";

const NextGeneration: React.FC = () => (
  <FirmwareReleasePicker onChanged={() => {}} />
);

export default NextGeneration;
