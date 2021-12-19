import { MockedProvider } from "@apollo/client/testing";
import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Layout from "renderer/Layout";
import SdcardEditor from "renderer/pages/sdcardv2/SdcardEditor";
import {
  sdcardAssetInfoQuery,
  sdcardInfoQuery,
  sdcardPacksQuery,
} from "./mocks";

export default {
  title: "Sdcard/SdcardEditor",
  component: SdcardEditor,
};

const Story: React.FC<{ good: boolean; exists?: boolean }> = ({
  good,
  exists = true,
}) => (
  <MockedProvider
    mocks={[
      sdcardInfoQuery(
        "some-id",
        // eslint-disable-next-line no-nested-ternary
        exists
          ? good
            ? { isValid: true, target: "nv14", version: "v2.5.0" }
            : { isValid: false }
          : undefined
      ),
      sdcardAssetInfoQuery("some-id", {
        version: "v2.5.0",
        target: "nv14",
        sounds: ["en"],
      }),
      sdcardPacksQuery,
    ]}
  >
    <MemoryRouter initialEntries={["/sdcard/some-id"]}>
      <Layout>
        <Routes>
          <Route path="/sdcard" element={<div>SD card selection</div>} />
          <Route path="/sdcard/:directoryId" element={<SdcardEditor />} />
          <Route path="/sdcard/:directoryId/:tab" element={<SdcardEditor />} />
        </Routes>
      </Layout>
    </MemoryRouter>
  </MockedProvider>
);

export const goodSdcard = () => <Story good />;
export const badSdcard = () => <Story good={false} />;
export const notExists = () => <Story good={false} exists={false} />;
