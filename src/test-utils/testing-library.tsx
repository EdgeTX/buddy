import { ConfigProvider } from "antd";
import React from "react";
import { fireEvent, render as origRender } from "@testing-library/react";

export const render = (children: React.ReactNode) => {
  const result = origRender(<ConfigProvider>{children}</ConfigProvider>);
  return {
    ...result,
    rerender: (c: React.ReactNode) =>
      result.rerender(<ConfigProvider>{c}</ConfigProvider>),
  };
};

export const openAntDropdown = (element: HTMLElement) => {
  fireEvent.keyDown(element, {
    key: "Enter",
    code: 13,
    charCode: 13,
  });
};
