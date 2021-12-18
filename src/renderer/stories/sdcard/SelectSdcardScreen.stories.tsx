import { MockedProvider } from "@apollo/client/testing";
import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Layout from "renderer/Layout";
import SelectSdcardScreen from "renderer/pages/sdcardv2/SelectSdcardScreen";
import { pickSdcardDirectoryMutation } from "./mocks";

export default {
  title: "Sdcard/SelectSdcardScreen",
  component: SelectSdcardScreen,
};

const Story: React.FC<{ select: boolean }> = ({ select }) => (
  <MockedProvider
    mocks={[pickSdcardDirectoryMutation(select ? "some-id" : undefined)]}
  >
    <MemoryRouter initialEntries={["/sdcard"]}>
      <Layout>
        <Routes>
          <Route path="/sdcard" element={<SelectSdcardScreen />} />
          <Route path="/sdcard/some-id" element={<div>Navigated!</div>} />
        </Routes>
      </Layout>
    </MemoryRouter>
  </MockedProvider>
);

export const directorySelected = () => <Story select />;
export const directoryNotSelected = () => <Story select={false} />;
