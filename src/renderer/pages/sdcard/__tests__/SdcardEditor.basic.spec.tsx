// src/renderer/pages/sdcard/__tests__/SdcardEditor.basic.spec.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import SdcardEditor from "renderer/pages/sdcard/SdcardEditor";
import { MockedProvider } from "@apollo/client/testing";
import { MemoryRouter } from "react-router-dom";
import { FULL_SDCARD_INFO } from "renderer/pages/sdcard/editor/sdcard.gql";
import { vi } from "vitest";

// Mock each child‐tab so we can assert on one of them:
vi.mock("renderer/pages/sdcard/editor/tabs/AssetsTab", () => ({
  default: () => <div data-testid="assets-tab">Assets Tab</div>,
}));
vi.mock("renderer/pages/sdcard/editor/tabs/ModelsListTab", () => ({
  default: () => <div data-testid="models-tab">Models Tab</div>,
}));
vi.mock("renderer/pages/sdcard/editor/tabs/ThemesListTab", () => ({
  default: () => <div data-testid="themes-tab">Themes Tab</div>,
}));
vi.mock("renderer/pages/sdcard/editor/tabs/RadioSettingsTab", () => ({
  default: () => <div data-testid="radio-tab">Radio Tab</div>,
}));
vi.mock("renderer/pages/sdcard/editor/tabs/BackupTab", () => ({
  default: () => <div data-testid="backup-tab">Backup Tab</div>,
}));
vi.mock("renderer/pages/sdcard/editor/tabs/RestoreTab", () => ({
  default: () => <div data-testid="restore-tab">Restore Tab</div>,
}));

// Stub out the router hooks so directoryId and tab come from our mock
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ directoryId: "test-dir-id", tab: "assets" }),
  };
});

// Stub use-media so nothing breaks in SSR
vi.mock("use-media", () => ({ default: () => false }));

// Single GraphQL mock
const createMockWithData = () => ({
  request: {
    query: FULL_SDCARD_INFO,
    variables: { directoryId: "test-dir-id" },
  },
  result: {
    data: {
      sdcardDirectory: {
        __typename: "SdcardDirectory",
        id: "test-dir-id",
        isValid: true,
        pack: {
          __typename: "SdcardPack",
          target: "x9d",
          version: "v2.5.0",
        },
      },
      sdcardAssetsDirectory: {
        __typename: "SdcardAssetsDirectory",
        id: "test-assets-id",
        isValid: true,
        models: [],
        themes: [],
        radio: [],
      },
    },
  },
});

describe("SdcardEditor Basic Tests", () => {
  const renderEditor = () => {
    render(
      <MockedProvider mocks={[createMockWithData()]} addTypename={false}>
        <MemoryRouter initialEntries={["/sdcard/test-dir-id/assets"]}>
          <SdcardEditor />
        </MemoryRouter>
      </MockedProvider>
    );
  };

  it("renders the assets tab", async () => {
    renderEditor();
    expect(await screen.findByTestId("assets-tab")).toBeInTheDocument();
  });

  it("respects the directoryId URL param", async () => {
    renderEditor();
    // if directoryId wasn't read from useParams(), the assets-tab wouldn't render
    expect(await screen.findByTestId("assets-tab")).toBeInTheDocument();
  });
});
