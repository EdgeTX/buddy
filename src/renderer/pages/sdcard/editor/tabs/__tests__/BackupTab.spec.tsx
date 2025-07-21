// src/renderer/pages/sdcard/editor/tabs/__tests__/BackupTab.spec.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { vi } from "vitest";
import BackupTab from "renderer/pages/sdcard/editor/tabs/BackupTab";
import { SD_CARD_DIRECTORY_INFO } from "renderer/pages/sdcard/editor/sdcard.gql";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

// Mock antd message API
vi.mock("antd", async () => {
  const actual = await vi.importActual("antd");
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    },
  };
});

const createDirectoryInfoMock = () => ({
  request: {
    query: SD_CARD_DIRECTORY_INFO,
    variables: { directoryId: "test-dir-id" },
  },
  result: {
    data: {
      sdcardAssetsDirectory: {
        id: "test-dir-id",
        isValid: true,
        models: [
          {
            name: "model1",
            yaml: "yaml content",
            parsed: {},
            bitmapName: "bitmap1.png",
            bitmapDataUrl: "data:image/png;base64,test",
          },
        ],
        themes: [
          {
            name: "theme1",
            yaml: "theme yaml",
            logoUrl: "logo.png",
            backgroundUrl: "bg.png",
          },
        ],
        radio: [
          {
            name: "radio1",
            yaml: "radio yaml",
            parsed: {},
          },
        ],
      },
    },
  },
});

describe("BackupTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(() => "blob:test-url");
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a loading spinner while fetching assets", async () => {
    render(
      <MockedProvider mocks={[createDirectoryInfoMock()]} addTypename={false}>
        <BackupTab
          directoryId="test-dir-id"
          assetType="MODELS"
          selected={["MODELS/model1", "MODELS/model2"]}
        />
      </MockedProvider>
    );

    // AntD <Spin> has role="status"
    expect(await screen.findByRole("status")).toBeInTheDocument();
  });

  it("handles different asset types without error", async () => {
    render(
      <MockedProvider mocks={[createDirectoryInfoMock()]} addTypename={false}>
        <BackupTab
          directoryId="test-dir-id"
          assetType="THEMES"
          selected={["THEMES/theme1"]}
        />
      </MockedProvider>
    );

    expect(await screen.findByRole("status")).toBeInTheDocument();
  });

  it("renders correctly when selection is empty", async () => {
    render(
      <MockedProvider mocks={[createDirectoryInfoMock()]} addTypename={false}>
        <BackupTab directoryId="test-dir-id" assetType="MODELS" selected={[]} />
      </MockedProvider>
    );

    expect(await screen.findByRole("status")).toBeInTheDocument();
  });

  it("renders the component without throwing", () => {
    render(
      <MockedProvider mocks={[createDirectoryInfoMock()]} addTypename={false}>
        <BackupTab
          directoryId="test-dir-id"
          assetType="MODELS"
          selected={["MODELS/model1"]}
        />
      </MockedProvider>
    );

    // Basic smoke assertion via Testing Library query
    expect(
      screen.getByRole("button", { name: /Download/i })
    ).toBeInTheDocument();
  });
});
