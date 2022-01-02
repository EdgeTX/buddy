import React from "react";
import { MemoryRouter } from "react-router-dom";
import Layout from "renderer/Layout";
import WebCompatInfo from "renderer/WebCompatInfo";

export default {
  title: "WebCompatInfo",
  component: WebCompatInfo,
};

export const missingEverything: React.FC = () => (
  <MemoryRouter>
    <Layout>Something</Layout>
    <WebCompatInfo missingFilesystemApi missingUsbApi />
  </MemoryRouter>
);

export const missingFilesystemApi: React.FC = () => (
  <MemoryRouter>
    <Layout>Something</Layout>
    <WebCompatInfo missingFilesystemApi />
  </MemoryRouter>
);

export const missingWebUSBApiAccess: React.FC = () => (
  <MemoryRouter>
    <Layout>Something</Layout>
    <WebCompatInfo missingUsbApi />
  </MemoryRouter>
);
