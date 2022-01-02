import React from "react";
import styled from "styled-components";

const Buttons = styled.div`
  height: 100%;
  line-height: 30px;
  -webkit-app-region: no-drag;
  display: flex;
`;

const Button = styled.div`
  text-align: center;
  color: #f7f7f7;
  cursor: default;
  font-size: 30px;
  width: 50px;
`;

const WindowsNav: React.FC = () => (
  <Buttons>
    <Button
      onClick={() => {
        window.browserWindow?.minimize();
      }}
    >
      <span>&#8210;</span>
    </Button>
    <Button style={{ opacity: 0.5 }}>
      <span>&#9633;</span>
    </Button>
    <Button
      onClick={() => {
        window.browserWindow?.close();
      }}
    >
      <span>&times;</span>
    </Button>
  </Buttons>
);

export default WindowsNav;
