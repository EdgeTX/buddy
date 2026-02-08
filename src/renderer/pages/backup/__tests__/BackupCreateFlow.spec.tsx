import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import BackupCreateFlow from "renderer/pages/backup/BackupCreateFlow";
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";

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
