import React from "react";
import { render, screen } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import RadioSettingsTab from "renderer/pages/sdcard/editor/tabs/RadioSettingsTab";
import { vi } from "vitest";

describe("RadioSettingsTab", () => {
  it("renders the empty state without crashing", () => {
    render(
      <MockedProvider>
        <RadioSettingsTab
          radio={[]}
          selectedRadio={[]}
          onToggleRadio={vi.fn()}
          allModels={[]}
          selectedModels={[]}
          onToggleModel={vi.fn()}
          allThemes={[]}
          selectedThemes={[]}
          onToggleTheme={vi.fn()}
        />
      </MockedProvider>
    );
    // AntD empty state shows this description when no radios are configured
    expect(
      screen.getByText("No radio configuration found")
    ).toBeInTheDocument();
  });

  it("displays radio settings correctly", () => {
    const mockRadio = [{ name: "Radio 1", yaml: "", parsed: {} }];

    render(
      <MockedProvider>
        <RadioSettingsTab
          radio={mockRadio}
          selectedRadio={mockRadio[0] ? [mockRadio[0].name] : []}
          onToggleRadio={vi.fn()}
          allModels={[]}
          selectedModels={[]}
          onToggleModel={vi.fn()}
          allThemes={[]}
          selectedThemes={[]}
          onToggleTheme={vi.fn()}
        />
      </MockedProvider>
    );

    expect(screen.getByText("Radio 1")).toBeInTheDocument();
  });

  it("handles missing settings gracefully", () => {
    render(
      <MockedProvider>
        <RadioSettingsTab
          radio={[]}
          selectedRadio={[]}
          onToggleRadio={vi.fn()}
          allModels={[]}
          selectedModels={[]}
          onToggleModel={vi.fn()}
          allThemes={[]}
          selectedThemes={[]}
          onToggleTheme={vi.fn()}
        />
      </MockedProvider>
    );

    // should match the actual empty‑state copy
    expect(
      screen.getByText("No radio configuration found")
    ).toBeInTheDocument();
  });
});
