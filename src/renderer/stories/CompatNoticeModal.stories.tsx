import React from "react";
import { MemoryRouter } from "react-router-dom";
import Layout from "renderer/Layout";
import CompatNoticeModal from "renderer/compatibility/CompatNoticeModal";

export default {
  title: "CompatNoticeModal",
  component: CompatNoticeModal,
};

export const missingEverything: React.FC = () => (
  <MemoryRouter>
    <Layout>Something</Layout>
    <CompatNoticeModal missingFilesystemApi missingUsbApi visible />
  </MemoryRouter>
);

export const missingFilesystemApi: React.FC = () => (
  <MemoryRouter>
    <Layout>Something</Layout>
    <CompatNoticeModal missingFilesystemApi visible />
  </MemoryRouter>
);

export const missingWebUSBApiAccess: React.FC = () => (
  <MemoryRouter>
    <Layout>Something</Layout>
    <CompatNoticeModal missingUsbApi visible />
  </MemoryRouter>
);
