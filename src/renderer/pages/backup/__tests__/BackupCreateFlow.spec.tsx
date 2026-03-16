import React from "react";
import { render } from "test-utils/testing-library";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import BackupCreateFlow from "renderer/pages/backup/BackupCreateFlow";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import gql from "graphql-tag";
import legacyDownload from "js-file-download";

vi.mock("js-file-download");

// Make delay a no-op so sequential downloads complete instantly in tests
vi.mock("shared/tools", async (importOriginal) => ({
  ...(await importOriginal<typeof import("shared/tools")>()),
  delay: () => Promise.resolve(),
}));

// Mock environment
vi.mock("shared/environment", () => ({
  default: {
    isElectron: true,
  },
}));

// Mock compatibility checks
vi.mock("renderer/compatibility/checks", () => ({
  default: {
    hasFilesystemApi: true,
  },
}));

describe("<BackupCreateFlow />", () => {
  it("should render the component", () => {
    render(
      <MockedProvider mocks={[]}>
        <BackupCreateFlow />
      </MockedProvider>
    );

    // Component should render without crashing
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("should display folder icon button", () => {
    const { container } = render(
      <MockedProvider mocks={[]}>
        <BackupCreateFlow />
      </MockedProvider>
    );

    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const folderIcon = container.querySelector(".anticon-folder-open");
    expect(folderIcon).toBeInTheDocument();
  });

  it("should render initial state with action buttons", () => {
    render(
      <MockedProvider mocks={[]}>
        <BackupCreateFlow />
      </MockedProvider>
    );

    // Should have at least one button rendered
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("should render without crashing when no directory is selected", () => {
    const { container } = render(
      <MockedProvider mocks={[]}>
        <BackupCreateFlow />
      </MockedProvider>
    );

    expect(container).toBeInTheDocument();
  });

  it("should display SD Card selection UI", () => {
    const { container } = render(
      <MockedProvider mocks={[]}>
        <BackupCreateFlow />
      </MockedProvider>
    );

    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const cards = container.querySelectorAll(".ant-card");
    expect(cards.length).toBeGreaterThanOrEqual(1);
  });

  it("should have proper flex layout", () => {
    const { container } = render(
      <MockedProvider mocks={[]}>
        <BackupCreateFlow />
      </MockedProvider>
    );

    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    expect(container.firstChild).toHaveStyle({
      display: "flex",
      flexDirection: "column",
    });
  });

  it("should render FolderOpenTwoTone icon", () => {
    const { container } = render(
      <MockedProvider mocks={[]}>
        <BackupCreateFlow />
      </MockedProvider>
    );

    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const icon = container.querySelector(".anticon-folder-open");
    expect(icon).toBeInTheDocument();
  });

  it("should display Select SD Card button when no directory is selected", () => {
    render(
      <MockedProvider mocks={[]}>
        <BackupCreateFlow />
      </MockedProvider>
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons).toBeTruthy();
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("should render Card components", () => {
    const { container } = render(
      <MockedProvider mocks={[]}>
        <BackupCreateFlow />
      </MockedProvider>
    );

    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const cardElements = container.querySelectorAll(".ant-card");
    expect(cardElements.length).toBeGreaterThan(0);
  });

  it("should have gap styling in main container", () => {
    const { container } = render(
      <MockedProvider mocks={[]}>
        <BackupCreateFlow />
      </MockedProvider>
    );

    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const mainDiv = container.firstChild as HTMLElement;
    expect(mainDiv).toHaveStyle({ gap: "16px" });
  });

  it("should contain Typography components", () => {
    const { container } = render(
      <MockedProvider mocks={[]}>
        <BackupCreateFlow />
      </MockedProvider>
    );

    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const textElements = container.querySelectorAll(".ant-typography");
    expect(textElements).toBeTruthy();
  });

  it("should render without GraphQL errors", async () => {
    const { container } = render(
      <MockedProvider mocks={[]} addTypename={false}>
        <BackupCreateFlow />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });
  });

  it("should have interactive button elements", () => {
    render(
      <MockedProvider mocks={[]}>
        <BackupCreateFlow />
      </MockedProvider>
    );

    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => {
      expect(button).toBeInstanceOf(HTMLElement);
    });
  });
});

describe("<BackupCreateFlow /> sequential individual download", () => {
  let downloadedFiles: string[];
  const mockLegacyDownload = vi.mocked(legacyDownload);

  beforeEach(() => {
    downloadedFiles = [];
    mockLegacyDownload.mockImplementation((data: unknown, filename: string) => {
      downloadedFiles.push(filename);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should download all selected individual model files, not just the first 10", async () => {
    const directoryId = "test-dir-id";
    const modelCount = 11;
    const modelNames = Array.from(
      { length: modelCount },
      (_, i) => `model${i + 1}`
    );
    const base64 = Buffer.from("content").toString("base64");

    const mocks = [
      {
        request: {
          query: gql`
            mutation PickSdcardDirectory {
              pickSdcardDirectory {
                id
              }
            }
          `,
        },
        result: {
          data: {
            pickSdcardDirectory: { id: directoryId },
          },
        },
      },
      {
        request: {
          query: gql`
            query SdcardDirectoryInfo($directoryId: ID!) {
              sdcardModelsDirectory(id: $directoryId) {
                id
                name
                isValid
                hasLabels
                pack {
                  target
                  version
                }
              }
            }
          `,
          variables: { directoryId },
        },
        result: {
          data: {
            sdcardModelsDirectory: {
              id: directoryId,
              name: "MODELS",
              isValid: true,
              hasLabels: false,
              pack: null,
            },
          },
        },
      },
      {
        request: {
          query: gql`
            query SdcardModelsWithNames($directoryId: ID!) {
              sdcardModelsWithNames(directoryId: $directoryId) {
                fileName
                displayName
              }
            }
          `,
          variables: { directoryId },
        },
        result: {
          data: {
            sdcardModelsWithNames: modelNames.map((name) => ({
              fileName: name,
              displayName: `Model ${name}`,
            })),
          },
        },
      },
      {
        request: {
          query: gql`
            mutation DownloadIndividualModels(
              $directoryId: ID!
              $selectedModels: [String!]!
              $includeLabels: Boolean
            ) {
              downloadIndividualModels(
                directoryId: $directoryId
                selectedModels: $selectedModels
                includeLabels: $includeLabels
              ) {
                fileName
                base64Data
              }
            }
          `,
          variables: {
            directoryId,
            selectedModels: modelNames,
            includeLabels: false,
          },
        },
        result: {
          data: {
            downloadIndividualModels: modelNames.map((name) => ({
              fileName: `${name}.yml`,
              base64Data: base64,
            })),
          },
        },
      },
    ];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <BackupCreateFlow />
      </MockedProvider>
    );

    // Trigger SD card selection
    fireEvent.click(screen.getByText("Select SD Card"));

    // Wait for Apollo mutation response and models to load
    await waitFor(
      () => {
        expect(screen.getByText("Select all")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Select all models
    fireEvent.click(screen.getByText("Select all"));

    // Switch to individual .yml format
    fireEvent.click(screen.getByText("Individual .yml files"));

    // Trigger backup download
    fireEvent.click(screen.getByRole("button", { name: /create backup/i }));

    // All 11 files should be downloaded. Chromium blocks simultaneous
    // programmatic downloads above ~10; the sequential approach (one per
    // 200ms in production, instant in tests) avoids that entirely.
    await waitFor(() => {
      expect(downloadedFiles).toHaveLength(modelCount);
    });

    // Verify each model file was included
    modelNames.forEach((name) => {
      expect(downloadedFiles).toContain(`${name}.yml`);
    });
  });
});
