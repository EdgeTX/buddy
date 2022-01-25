import React from "react";
import { render } from "test-utils/testing-library";
import DeviceList from "renderer/components/devices/DeviceList";
import { exampleDevices } from "test-utils/data";
import { screen } from "@testing-library/react";

describe("<DeviceList />", () => {
  it("should render loading when device list is loading", () => {
    const { asFragment } = render(<DeviceList devices={[]} loading />);

    expect(asFragment()).toMatchSnapshot();
  });

  it("should render a device details", () => {
    const device = exampleDevices[0]!;
    render(<DeviceList devices={[device]} />);

    const row = screen.getByRole("row");
    expect(row).toHaveTextContent(device.productName);
    expect(row).toHaveTextContent(device.productId);
    expect(row).toHaveTextContent(device.vendorId);
    expect(row).toHaveTextContent(device.serialNumber);
    expect(row).toMatchSnapshot();
  });

  it("should render a device as selected", () => {
    const device = exampleDevices[0]!;
    render(
      <DeviceList
        devices={exampleDevices.slice(0, 2)}
        selectedDeviceId={device.id}
      />
    );
    const row = screen.getByRole("row", { selected: true });

    expect(row).toMatchSnapshot();
  });
});
