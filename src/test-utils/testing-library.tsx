import { ConfigProvider } from "antd";
import React from "react";
import { render as origRender } from "@testing-library/react";

export const render = (children: React.ReactNode) => {
  const result = origRender(<ConfigProvider>{children}</ConfigProvider>);
  return {
    ...result,
    rerender: (c: React.ReactNode) =>
      result.rerender(<ConfigProvider>{c}</ConfigProvider>),
  };
};
