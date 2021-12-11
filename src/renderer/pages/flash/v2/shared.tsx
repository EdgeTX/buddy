import { Card } from "antd";
import React from "react";
import styled from "styled-components";

export const StepControlsContainer: React.FC = ({ children }) => (
  <div style={{ marginTop: "24px" }}>{children}</div>
);

export const StepContentContainer: React.FC = ({ children }) => (
  <Card
    style={{
      height: "100%",
      margin: "16px",
    }}
    bodyStyle={{
      height: "100%",
      padding: "16px",
    }}
  >
    {children}
  </Card>
);

export const Centered = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

export const FullHeight = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
`;
