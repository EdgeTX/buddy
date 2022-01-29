import React from "react";
import { render } from "test-utils/testing-library";
import CompatNoticeHandler from "renderer/compatibility/CompatNoticeHandler";
import checks from "renderer/compatibility/checks";
import { fireEvent, screen } from "@testing-library/react";

beforeEach(() => {
  // @ts-expect-error don't care about this
  checks.hasFilesystemApi = false;
  // @ts-expect-error don't care about this
  checks.hasUsbApi = false;

  window.localStorage.clear();
});

describe("<CompatNoticeHandler />", () => {
  it("should display a modal when browser is not compatible", () => {
    render(<CompatNoticeHandler />);

    expect(
      screen.getByText("Your browser doesn't support EdgeTX Buddy")
    ).toBeVisible();
  });

  it("should not display a modal when browser is compatible", () => {
    // @ts-expect-error don't care about this
    checks.hasFilesystemApi = true;
    // @ts-expect-error don't care about this
    checks.hasUsbApi = true;
    render(<CompatNoticeHandler />);

    expect(
      screen.queryByText("Your browser doesn't support EdgeTX Buddy")
    ).toBeFalsy();
  });

  it("should display again if dismissed and app is reopened", () => {
    const { unmount } = render(<CompatNoticeHandler />);

    fireEvent.click(screen.getByLabelText("Close"));
    expect(
      screen.getByText("Your browser doesn't support EdgeTX Buddy")
    ).not.toBeVisible();

    unmount();
    render(<CompatNoticeHandler />);
    expect(
      screen.getByText("Your browser doesn't support EdgeTX Buddy")
    ).toBeVisible();
  });

  it("should not display again if 'dont show again' is clicked", () => {
    const { unmount } = render(<CompatNoticeHandler />);

    fireEvent.click(screen.getByLabelText("Don't show again"));
    unmount();

    render(<CompatNoticeHandler />);
    expect(
      screen.queryByText("Your browser doesn't support EdgeTX Buddy")
    ).toBeFalsy();
  });
});
