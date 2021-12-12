import React from "react";
import styled from "styled-components";

export const StepControlsContainer: React.FC = ({ children }) => (
  <div
    style={{
      marginTop: "16px",
    }}
  >
    {children}
  </div>
);

export const StepContentContainer: React.FC = ({ children }) => (
  <div
    style={{
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
`;
