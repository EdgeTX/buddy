// src/renderer/pages/sdcard/editor/tabs/__tests__/RestoreTab.spec.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { vi } from "vitest";
import RestoreTab from "renderer/pages/sdcard/editor/tabs/RestoreTab";
import { SD_CARD_DIRECTORY_INFO } from "renderer/pages/sdcard/editor/sdcard.gql";

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
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

// Mock JSZip
vi.mock("jszip", () => ({
  default: vi.fn().mockImplementation(() => ({
    loadAsync: vi.fn().mockResolvedValue({
      files: {
        "MODELS/model1.yml": {
          name: "MODELS/model1.yml",
          async: vi.fn().mockResolvedValue("model1 content"),
        },
      },
    }),
  })),
}));

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

describe("RestoreTab", () => {
  let mockReader: FileReader;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock FileReader without using `this` or `any`
    const reader: Partial<FileReader> & {
      readAsArrayBuffer: (file: File) => void;
      onload: (e: ProgressEvent<FileReader>) => void;
      onerror: (e: ProgressEvent<FileReader>) => void;
    } = {
      onload: (_e) => {
        console.log("File loaded", _e);
      },
      onerror: (_e) => {
        console.error("File read error", _e);
      },
      result: null,
      readAsArrayBuffer(file) {
        console.log("Reading file as ArrayBuffer", file);
        setTimeout(() => {
          (reader as any).result = new ArrayBuffer(8);
          reader.onload({
            target: reader as FileReader,
          } as ProgressEvent<FileReader>);
        }, 0);
      },
    };
    mockReader = reader as FileReader;
    global.FileReader = vi.fn(() => mockReader) as unknown as typeof FileReader;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders file selection interface", async () => {
    render(
      <MockedProvider mocks={[createDirectoryInfoMock()]} addTypename={false}>
        <RestoreTab
          directoryId="test-dir-id"
          assetType="MODELS"
          selected={[]}
        />
      </MockedProvider>
    );
    expect(
      await screen.findByText("Select Backup ZIP or ETX")
    ).toBeInTheDocument();
  });

  it("supports other asset types without error", async () => {
    render(
      <MockedProvider mocks={[createDirectoryInfoMock()]} addTypename={false}>
        <RestoreTab
          directoryId="test-dir-id"
          assetType="THEMES"
          selected={[]}
        />
      </MockedProvider>
    );
    expect(
      await screen.findByText("Select Backup ZIP or ETX")
    ).toBeInTheDocument();
  });

  it("mounts without crashing", () => {
    render(
      <MockedProvider mocks={[createDirectoryInfoMock()]} addTypename={false}>
        <RestoreTab
          directoryId="test-dir-id"
          assetType="MODELS"
          selected={[]}
        />
      </MockedProvider>
    );
    expect(screen.getByText).toBeDefined();
  });
});
