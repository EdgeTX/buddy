import React from "react";
import styled from "styled-components";

const Buttons = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 46px);
  -webkit-app-region: no-drag;
  height: 32px;
  line-height: 32px;
  color: white;
  font-size: 10px;
  font-family: "Segoe MDL2 Assets";

  .min-button {
    grid-column: 1;
  }
  .max-button,
  .restore-button {
    grid-column: 2;
  }
  .close-button {
    grid-column: 3;
  }

  .close-button:hover {
    background: #e81123 !important;
  }
  .close-button:active {
    background: #f1707a !important;
  }
  .close-button:active .icon {
    filter: invert(1);
  }

  -webkit-app-region: no-drag;
`;

const Button = styled.div`
  grid-row: 1 / span 1;
  display: flex;
  justify-content: center;
  align-items: center;
  user-select: none;
  width: 100%;
  height: 100%;

  &:active {
    background: rgba(255, 255, 255, 0.2);
  }

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const WindowsNav: React.FC = () => (
  <Buttons>
    <Button
      className="min-button"
      title="Window minimize"
      onClick={() => {
        window.electronMinimize?.();
      }}
    >
      &#xE921;
    </Button>
    <Button
      className="max-button"
      title="Window maximize"
      aria-disabled="true"
      style={{ opacity: 0.5 }}
    >
      &#xE922;
    </Button>
    <Button
      className="close-button"
      title="Window close"
      onClick={() => {
        window.electronClose?.();
      }}
    >
      &#xE8BB;
    </Button>
  </Buttons>
);

export default WindowsNav;
