import { ConfigProvider } from "antd";
import React from "react";
import { render as origRender } from "@testing-library/react";

export const render = (children: React.ReactNode) =>
  origRender(<ConfigProvider>{children}</ConfigProvider>);
