import React from "react";
import { fireEvent, screen } from "@testing-library/react";
import { render } from "test-utils/testing-library";
import BackupScreen from "renderer/pages/backup/BackupScreen";

// Mock the child components to isolate BackupScreen tests
vitest.mock("renderer/pages/backup/BackupRestoreFlow", () => ({
  default: () => <div data-testid="backup-restore-flow">BackupRestoreFlow</div>,
}));

vitest.mock("renderer/pages/backup/BackupCreateFlow", () => ({
  default: () => <div data-testid="backup-create-flow">BackupCreateFlow</div>,
}));

describe("<BackupScreen />", () => {
  it("should render the backup screen with restore tab active by default", () => {
    render(<BackupScreen />);

    // Check that both tabs are visible (tab + title = multiple elements)
    const restoreTexts = screen.getAllByText("Restore backup");
    expect(restoreTexts.length).toBeGreaterThanOrEqual(2); // Tab + Title
    const createTexts = screen.getAllByText("Create backup");
    expect(createTexts.length).toBeGreaterThanOrEqual(1);

    // BackupRestoreFlow should be rendered by default
    expect(screen.getByTestId("backup-restore-flow")).toBeInTheDocument();
    expect(screen.queryByTestId("backup-create-flow")).not.toBeInTheDocument();
  });

  it("should render the title for restore tab", () => {
    render(<BackupScreen />);

    // Title should show "Restore backup" for the active tab
    const titles = screen.getAllByText("Restore backup");
    expect(titles.length).toBeGreaterThanOrEqual(1);
  });

  it("should switch to create backup tab when clicked", () => {
    render(<BackupScreen />);

    // Initially, restore flow is shown
    expect(screen.getByTestId("backup-restore-flow")).toBeInTheDocument();

    // Click on "Create backup" tab
    fireEvent.click(screen.getByText("Create backup"));

    // Now create flow should be shown
    expect(screen.getByTestId("backup-create-flow")).toBeInTheDocument();
    expect(screen.queryByTestId("backup-restore-flow")).not.toBeInTheDocument();
  });

  it("should switch back to restore tab when clicked", () => {
    render(<BackupScreen />);

    // Switch to create tab
    fireEvent.click(screen.getByText("Create backup"));
    expect(screen.getByTestId("backup-create-flow")).toBeInTheDocument();

    // Switch back to restore tab
    const restoreButtons = screen.getAllByText("Restore backup");
    fireEvent.click(restoreButtons[0]!);

    // Restore flow should be shown again
    expect(screen.getByTestId("backup-restore-flow")).toBeInTheDocument();
    expect(screen.queryByTestId("backup-create-flow")).not.toBeInTheDocument();
  });
});
