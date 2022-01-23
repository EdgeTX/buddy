import { MockedProvider } from "@apollo/client/testing";
import { Tabs } from "antd";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import AssetsTab from "renderer/pages/sdcard/editor/AssetsTab";

export default {
  title: "Sdcard/Editor/AssetsTab",
  component: AssetsTab,
};

export const withData: React.FC = () => (
  <MockedProvider>
    <MemoryRouter>
      <AssetsTab directoryId="some-directory" />
    </MemoryRouter>
  </MockedProvider>
);

export const inTabs: React.FC = () => (
  <MockedProvider>
    <MemoryRouter>
      <Tabs defaultActiveKey="1" size="large" type="card">
        <Tabs.TabPane tab="Assets" key="1">
          <AssetsTab directoryId="some-directory" />
        </Tabs.TabPane>
      </Tabs>
    </MemoryRouter>
  </MockedProvider>
);
