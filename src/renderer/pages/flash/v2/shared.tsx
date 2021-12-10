import { Card } from "antd";
import React from "react";

export const StepControlsContainer: React.FC = ({ children }) => (
  <div style={{ marginTop: "24px" }}>{children}</div>
);

export const StepContentContainer: React.FC = ({ children }) => (
  <Card
    style={{
      height: "100%",
      margin: "40px",
    }}
    bodyStyle={{
      height: "100%",
    }}
  >
    {children}
  </Card>
);
