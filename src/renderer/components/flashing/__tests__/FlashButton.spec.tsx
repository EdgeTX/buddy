import React from "react";
import { render } from "test-utils/testing-library";

import config from "shared/config";
import { fireEvent, screen } from "@testing-library/react";
import FlashButton from "renderer/components/flashing/FlashButton";
import checks from "renderer/compatibility/checks";

// @ts-expect-error don't care about this
checks.hasUsbApi = false;

describe("<FlashButton />", () => {
  it("should render a tooltip when clicked if flashing is not supported", () => {
    config.isElectron = false;
    // @ts-expect-error we want to set this to null so that
    // the component thinks we are not in a supporting environment
    navigator.usb.requestDevice = null;
    render(<FlashButton />);

    expect(screen.queryByRole("tooltip")).toBeFalsy();

    fireEvent.click(screen.getByText("Flash via USB"));

    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("should pass back click when clicked", () => {
    config.isElectron = true;
    const onClick = jest.fn();

    render(<FlashButton onClick={onClick} />);

    fireEvent.click(screen.getByText("Flash via USB"));
    expect(screen.queryByRole("tooltip")).toBeFalsy();

    expect(onClick).toHaveBeenCalled();
  });
});
