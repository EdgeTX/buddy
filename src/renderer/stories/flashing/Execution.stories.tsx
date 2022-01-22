import { MockedProvider } from "@apollo/client/testing";
import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import FlashExecution from "renderer/components/flash/FlashExecution";
import { flashJobQuery, firmwareReleaseInfoQuery } from "./mocks";

export default {
  title: "Flashing/FlashExecution",
  component: FlashExecution,
};

export const running: React.FC = () => (
  <MemoryRouter initialIndex={1} initialEntries={["/flash/123"]}>
    <MockedProvider mocks={[flashJobQuery("123"), firmwareReleaseInfoQuery]}>
      <Routes>
        <Route path="/flash/:jobId" element={<FlashExecution />} />
      </Routes>
    </MockedProvider>
  </MemoryRouter>
);

export const errorRunning: React.FC = () => (
  <MemoryRouter initialIndex={1} initialEntries={["/flash/123"]}>
    <MockedProvider
      mocks={[flashJobQuery("123", true), firmwareReleaseInfoQuery]}
    >
      <Routes>
        <Route path="/flash/:jobId" element={<FlashExecution />} />
      </Routes>
    </MockedProvider>
  </MemoryRouter>
);

export const completed: React.FC = () => (
  <MemoryRouter initialIndex={1} initialEntries={["/flash/123"]}>
    <MockedProvider
      mocks={[flashJobQuery("123", false, true), firmwareReleaseInfoQuery]}
    >
      <Routes>
        <Route path="/flash/:jobId" element={<FlashExecution />} />
      </Routes>
    </MockedProvider>
  </MemoryRouter>
);
