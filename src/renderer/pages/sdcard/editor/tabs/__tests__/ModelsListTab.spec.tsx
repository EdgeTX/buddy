import React from "react";
import { render, screen } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import ModelsListTab from "renderer/pages/sdcard/editor/tabs/ModelsListTab";
import { vi } from "vitest";

describe("ModelsListTab", () => {
  it("renders the search input without crashing", () => {
    render(
      <MockedProvider>
        <ModelsListTab models={[]} selected={[]} onToggle={vi.fn()} />
      </MockedProvider>
    );
    // the search box is always shown
    expect(
      screen.getByPlaceholderText("Search models or labels…")
    ).toBeInTheDocument();
  });

  it("displays a list of models", () => {
    const mockModels = [
      {
        name: "Model 1",
        yaml: "",
        parsed: {},
        bitmapName: "",
        bitmapDataUrl: "",
      },
      {
        name: "Model 2",
        yaml: "",
        parsed: {},
        bitmapName: "",
        bitmapDataUrl: "",
      },
    ];

    render(
      <MockedProvider>
        <ModelsListTab models={mockModels} selected={[]} onToggle={vi.fn()} />
      </MockedProvider>
    );

    mockModels.forEach((model) => {
      expect(screen.getByText(model.name)).toBeInTheDocument();
    });
  });

  it("handles empty model list gracefully", () => {
    render(
      <MockedProvider>
        <ModelsListTab models={[]} selected={[]} onToggle={vi.fn()} />
      </MockedProvider>
    );

    // with no models you still get the search input, and no items rendered
    expect(
      screen.getByPlaceholderText("Search models or labels…")
    ).toBeInTheDocument();
    expect(screen.queryByText(/Model \d+/)).toBeNull();
  });
});
