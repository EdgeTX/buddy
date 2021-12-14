import { Space } from "antd";
import React from "react";
import styled from "styled-components";

export const StepControlsContainer: React.FC = ({ children }) => (
  <div
    style={{
      marginTop: "16px",
      display: "flex",
      flexDirection: "row",
      justifyContent: "center",
    }}
  >
    <Space>{children}</Space>
  </div>
);

export const StepContentContainer: React.FC = ({ children }) => (
  <div
    style={{
      minHeight: 0,
      height: "100%",
      padding: "16px",
    }}
  >
    {children}
  </div>
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
  min-height: 0;
`;
