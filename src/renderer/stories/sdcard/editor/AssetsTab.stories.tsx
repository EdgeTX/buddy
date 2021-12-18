import { MockedProvider } from "@apollo/client/testing";
import { Tabs } from "antd";
import React from "react";
import AssetsTab from "renderer/pages/sdcardv2/editor/AssetsTab";

export default {
  title: "Sdcard/Editor/AssetsTab",
  component: AssetsTab,
};

export const withData: React.FC = () => (
  <MockedProvider>
    <AssetsTab directoryId="some-directory" />
  </MockedProvider>
);

export const inTabs: React.FC = () => (
  <MockedProvider>
    <Tabs defaultActiveKey="1" size="large" type="card">
      <Tabs.TabPane tab="Assets" key="1">
        <AssetsTab directoryId="some-directory" />
      </Tabs.TabPane>
    </Tabs>
  </MockedProvider>
);
