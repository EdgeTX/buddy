import React from "react";
import { render } from "test-utils/testing-library";
import CompatNoticeHandler from "renderer/compatibility/CompatNoticeHandler";
import checks from "renderer/compatibility/checks";
import { fireEvent, screen } from "@testing-library/react";

const setHasFsApi = (value: boolean) => {
  // @ts-expect-error don't care about this
  checks.hasFilesystemApi = value;
};

const setHasUsbApi = (value: boolean) => {
  // @ts-expect-error don't care about this
  checks.hasUsbApi = value;
};

beforeEach(() => {
  setHasFsApi(false);
  setHasUsbApi(false);

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
    setHasFsApi(true);
    setHasUsbApi(true);

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

  it("should display when the file system api is missing", () => {
    setHasUsbApi(true);
    render(<CompatNoticeHandler />);

    expect(screen.getByText("Missing File System Access API -")).toBeVisible();
    expect(screen.getByText("We have WebUSB API access")).toBeVisible();
  });

  it("should display when the usb api is missing", () => {
    setHasFsApi(true);
    render(<CompatNoticeHandler />);

    expect(screen.getByText("Missing WebUSB API -")).toBeVisible();
    expect(
      screen.getByText("We have File System Access API access")
    ).toBeVisible();
  });
});
