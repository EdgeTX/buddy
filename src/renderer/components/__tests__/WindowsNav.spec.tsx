import React from "react";
import { render } from "test-utils/testing-library";
import WindowsNav from "renderer/components/WindowsNav";
import { fireEvent, screen } from "@testing-library/react";

describe("<WindowsNav />", () => {
  it("should call electron close when close is clicked", () => {
    window.electronClose = jest.fn();
    render(<WindowsNav />);

    fireEvent.click(screen.getByTitle("Window close"));

    expect(window.electronClose).toHaveBeenCalled();
  });

  it("should call electron minimize when minimize is clicked", () => {
    window.electronMinimize = jest.fn();
    render(<WindowsNav />);

    fireEvent.click(screen.getByTitle("Window minimize"));

    expect(window.electronMinimize).toHaveBeenCalled();
  });

  test("maximize should be disabled", () => {
    render(<WindowsNav />);

    expect(screen.getByTitle("Window maximize")).toHaveAttribute(
      "aria-disabled",
      "true"
    );
  });
});
