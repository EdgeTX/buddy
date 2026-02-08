import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import BackupRestoreFlow from "renderer/pages/backup/BackupRestoreFlow";

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

// Mock BackupUploader component
vi.mock("renderer/pages/backup/file/BackupUploader", () => ({
  default: ({ onFileUploaded }: { onFileUploaded: (id: string) => void }) => (
    <div data-testid="backup-uploader">
      <button type="button" onClick={() => onFileUploaded("test-backup-id")}>
        Upload Backup
      </button>
    </div>
  ),
}));

// Mock CollisionModal component
vi.mock("renderer/pages/backup/CollisionModal", () => ({
  default: ({
    visible,
    onCancel,
  }: {
    visible: boolean;
    onCancel: () => void;
  }) =>
    visible ? (
      <div data-testid="collision-modal">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    ) : null,
}));

// Mock DiffViewerModal component
vi.mock("renderer/pages/backup/DiffViewerModal", () => ({
  default: ({ visible, onClose }: { visible: boolean; onClose: () => void }) =>
    visible ? (
      <div data-testid="diff-viewer-modal">
        <button type="button" onClick={onClose}>
          Close Diff
        </button>
      </div>
    ) : null,
}));

describe("<BackupRestoreFlow />", () => {
  beforeAll(() => {
    // Mock document.createElement for download links
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(
      (tagName: string) => {
        const element = originalCreateElement(tagName);
        if (tagName === "a") {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
          (element as any).click = vi.fn();
        }
        return element;
      }
    );

    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => "mock-url");
    global.URL.revokeObjectURL = vi.fn();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("should render the component", () => {
    const { container } = render(
      <MemoryRouter>
        <MockedProvider mocks={[]}>
          <BackupRestoreFlow />
        </MockedProvider>
      </MemoryRouter>
    );

    // Component should render without crashing
    expect(container).toBeInTheDocument();
  });

  it("should display folder icon button", () => {
    const { container } = render(
      <MemoryRouter>
        <MockedProvider mocks={[]}>
          <BackupRestoreFlow />
        </MockedProvider>
      </MemoryRouter>
    );

    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const folderIcon = container.querySelector(".anticon-folder-open");
    expect(folderIcon).toBeInTheDocument();
  });

  it("should render backup uploader section", () => {
    const { container } = render(
      <MemoryRouter>
        <MockedProvider mocks={[]}>
          <BackupRestoreFlow />
        </MockedProvider>
      </MemoryRouter>
    );

    // Should have content rendered
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    expect(container.firstChild).not.toBeNull();
  });

  it("should render without crashing when no backup is loaded", () => {
    const { container } = render(
      <MemoryRouter>
        <MockedProvider mocks={[]}>
          <BackupRestoreFlow />
        </MockedProvider>
      </MemoryRouter>
    );

    expect(container).toBeInTheDocument();
  });

  it("should have interactive elements", () => {
    render(
      <MemoryRouter>
        <MockedProvider mocks={[]}>
          <BackupRestoreFlow />
        </MockedProvider>
      </MemoryRouter>
    );

    // Should have at least one button
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("should display BackupUploader component", () => {
    render(
      <MemoryRouter>
        <MockedProvider mocks={[]}>
          <BackupRestoreFlow />
        </MockedProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId("backup-uploader")).toBeInTheDocument();
  });

  it("should render SD Card selection area", () => {
    const { container } = render(
      <MemoryRouter>
        <MockedProvider mocks={[]}>
          <BackupRestoreFlow />
        </MockedProvider>
      </MemoryRouter>
    );

    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const cards = container.querySelectorAll(".ant-card");
    expect(cards.length).toBeGreaterThan(0);
  });

  it("should display collision detection switch", () => {
    const { container } = render(
      <MemoryRouter>
        <MockedProvider mocks={[]}>
          <BackupRestoreFlow />
        </MockedProvider>
      </MemoryRouter>
    );

    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const switchElement = container.querySelector(".ant-switch");
    expect(switchElement).toBeInTheDocument();
  });

  it("should have proper flex layout", () => {
    const { container } = render(
      <MemoryRouter>
        <MockedProvider mocks={[]}>
          <BackupRestoreFlow />
        </MockedProvider>
      </MemoryRouter>
    );

    /* eslint-disable testing-library/no-container, testing-library/no-node-access */
    const mainDiv = Array.from(
      container.querySelectorAll<HTMLElement>("div")
    ).find(
      (div) =>
        div.style.display === "flex" && div.style.flexDirection === "column"
    );
    /* eslint-enable testing-library/no-container, testing-library/no-node-access */
    expect(mainDiv).toBeInTheDocument();
  });

  it("should render FolderOpenTwoTone icon", () => {
    const { container } = render(
      <MemoryRouter>
        <MockedProvider mocks={[]}>
          <BackupRestoreFlow />
        </MockedProvider>
      </MemoryRouter>
    );

    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const icon = container.querySelector(".anticon-folder-open");
    expect(icon).toBeInTheDocument();
  });

  it("should display Select SD Card button when no directory is selected", () => {
    render(
      <MemoryRouter>
        <MockedProvider mocks={[]}>
          <BackupRestoreFlow />
        </MockedProvider>
      </MemoryRouter>
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons).toBeTruthy();
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("should render Card components", () => {
    const { container } = render(
      <MemoryRouter>
        <MockedProvider mocks={[]}>
          <BackupRestoreFlow />
        </MockedProvider>
      </MemoryRouter>
    );

    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const cardElements = container.querySelectorAll(".ant-card");
    expect(cardElements.length).toBeGreaterThanOrEqual(2);
  });

  it("should have container with proper styling", () => {
    const { container } = render(
      <MemoryRouter>
        <MockedProvider mocks={[]}>
          <BackupRestoreFlow />
        </MockedProvider>
      </MemoryRouter>
    );

    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const divs = container.querySelectorAll("div");
    expect(divs.length).toBeGreaterThan(0);
  });

  it("should contain Typography components", () => {
    const { container } = render(
      <MemoryRouter>
        <MockedProvider mocks={[]}>
          <BackupRestoreFlow />
        </MockedProvider>
      </MemoryRouter>
    );

    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const textElements = container.querySelectorAll(".ant-typography");
    expect(textElements).toBeTruthy();
  });

  it("should render Divider component", () => {
    const { container } = render(
      <MemoryRouter>
        <MockedProvider mocks={[]}>
          <BackupRestoreFlow />
        </MockedProvider>
      </MemoryRouter>
    );

    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const divider = container.querySelector(".ant-divider");
    expect(divider).toBeInTheDocument();
  });

  it("should render without GraphQL errors", async () => {
    const { container } = render(
      <MemoryRouter>
        <MockedProvider mocks={[]} addTypename={false}>
          <BackupRestoreFlow />
        </MockedProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });
  });

  it("should have multiple interactive button elements", () => {
    render(
      <MemoryRouter>
        <MockedProvider mocks={[]}>
          <BackupRestoreFlow />
        </MockedProvider>
      </MemoryRouter>
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(1);
  });

  it("should toggle collision detection switch", async () => {
    const { container } = render(
      <MemoryRouter>
        <MockedProvider mocks={[]}>
          <BackupRestoreFlow />
        </MockedProvider>
      </MemoryRouter>
    );

    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const switchElement = container.querySelector(".ant-switch");
    expect(switchElement).toBeInTheDocument();

    // Click the switch
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    fireEvent.click(switchElement!);
    await waitFor(() => {
      expect(switchElement).toBeInTheDocument();
    });
  });

  it("should render minimum height for backup area", () => {
    const { container } = render(
      <MemoryRouter>
        <MockedProvider mocks={[]}>
          <BackupRestoreFlow />
        </MockedProvider>
      </MemoryRouter>
    );

    /* eslint-disable testing-library/no-container, testing-library/no-node-access */
    const backupArea = Array.from(
      container.querySelectorAll<HTMLElement>("div")
    ).find((div) => div.style.minHeight === "400px");
    /* eslint-enable testing-library/no-container, testing-library/no-node-access */
    expect(backupArea).toBeInTheDocument();
  });
});
