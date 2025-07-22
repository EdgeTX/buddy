import React from "react";
import { render, screen } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import AssetsTab from "renderer/pages/sdcard/editor/tabs/AssetsTab";
import { MemoryRouter } from "react-router-dom";

describe("AssetsTab", () => {
  it("renders the version selector and header without crashing", () => {
    render(
      <MockedProvider>
        <MemoryRouter>
          <AssetsTab directoryId="test-dir-id" />
        </MemoryRouter>
      </MockedProvider>
    );
    // the Firmware version select should be present…
    expect(screen.getByLabelText("Firmware version")).toBeInTheDocument();
    // …and the Available sounds header should always render
    expect(screen.getByText("Available sounds")).toBeInTheDocument();
  });

  it("renders action buttons disabled by default", () => {
    render(
      <MockedProvider>
        <MemoryRouter>
          <AssetsTab directoryId="test-dir-id" />
        </MemoryRouter>
      </MockedProvider>
    );

    const revertBtn = screen.getByRole("button", { name: /Revert changes/i });
    const applyBtn = screen.getByRole("button", { name: /Apply changes/i });
    const reinstallBtn = screen.getByRole("button", { name: /Re-install/i });

    expect(revertBtn).toBeDisabled();
    expect(applyBtn).toBeDisabled();
    expect(reinstallBtn).toBeDisabled();
  });

  it("handles empty asset list gracefully", () => {
    render(
      <MockedProvider>
        <MemoryRouter>
          <AssetsTab directoryId="test-dir-id" />
        </MemoryRouter>
      </MockedProvider>
    );

    // this is the real empty-state copy:
    expect(
      screen.getByText("Select SD Card version to see available sounds")
    ).toBeInTheDocument();
  });
});
