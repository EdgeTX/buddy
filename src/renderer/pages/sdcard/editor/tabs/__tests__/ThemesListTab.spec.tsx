import React from "react";
import { render, screen } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import ThemesListTab from "renderer/pages/sdcard/editor/tabs/ThemesListTab";
import { vi } from "vitest";

describe("ThemesListTab", () => {
  it("renders the collapse container without crashing", () => {
    render(
      <MockedProvider>
        <ThemesListTab themes={[]} selected={[]} onToggle={vi.fn()} />
      </MockedProvider>
    );
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });

  it("renders one panel per theme", () => {
    const mockThemes = [
      { name: "Theme 1", yaml: "", logoUrl: "", backgroundUrl: "" },
      { name: "Theme 2", yaml: "", logoUrl: "", backgroundUrl: "" },
    ];

    render(
      <MockedProvider>
        <ThemesListTab themes={mockThemes} selected={[]} onToggle={vi.fn()} />
      </MockedProvider>
    );
    // each collapse header gets role="tab"
    const panels = screen.getAllByRole("tab");
    expect(panels).toHaveLength(mockThemes.length);
  });

  it("renders no panels when themes is empty", () => {
    render(
      <MockedProvider>
        <ThemesListTab themes={[]} selected={[]} onToggle={vi.fn()} />
      </MockedProvider>
    );
    // with no themes passed in, there should be zero headers
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
  });
});
