import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render } from "test-utils/testing-library";
import CopyUrlButton from "renderer/components/firmware/CopyUrlButton";
import { fireEvent, screen } from "@testing-library/react";
import copy from "copy-text-to-clipboard";
import { mocked } from "jest-mock";
import { act } from "react-dom/test-utils";

// Previously mocked in `.jest/setupAfterEnv`
const copyMock = mocked(copy);

afterEach(() => {
  jest.useRealTimers();
});

describe("CopyUrlButton", () => {
  it("should copy the url to the firmware configuration", () => {
    render(
      <MemoryRouter initialEntries={["/current-page"]} initialIndex={0}>
        <CopyUrlButton target="nv14" version="v2.7.0" />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText("Copy URL"));

    expect(copyMock).toHaveBeenCalledWith(
      "localhost/#/current-page?version=v2.7.0&target=nv14"
    );
  });

  it("should show a tooltip for 2 seconds when the url is copied", async () => {
    jest.useFakeTimers("modern");

    render(
      <MemoryRouter initialEntries={["/current-page"]} initialIndex={0}>
        <CopyUrlButton target="nv14" version="v2.7.0" />
      </MemoryRouter>
    );

    expect(screen.queryByRole("tooltip")).toBeFalsy();

    fireEvent.click(screen.getByText("Copy URL"));

    const tooltip = screen.getByRole("tooltip");
    const tooltipContainer =
      // eslint-disable-next-line testing-library/no-node-access
      tooltip.parentElement?.parentElement;

    // Visible after click
    expect(tooltip).toHaveTextContent("Copied to clipboard");
    expect(tooltipContainer).toHaveClass("ant-tooltip");
    expect(tooltipContainer).not.toHaveClass("ant-tooltip-hidden");

    jest.advanceTimersByTime(1999);

    // still visible
    expect(tooltipContainer).not.toHaveClass("ant-tooltip-hidden");

    await act(() => {
      jest.advanceTimersByTime(1);
      return Promise.resolve();
    });

    expect(tooltipContainer).toHaveClass("ant-tooltip-hidden");
  });
});
