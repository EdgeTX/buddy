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

const Story: React.FC<{ isValid: boolean }> = ({ isValid }) => (
  <MockedProvider mocks={[pickSdcardDirectoryMutation(isValid)]}>
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

export const invalidDirectory = () => <Story isValid={false} />;

export const validDirectory = () => <Story isValid />;
