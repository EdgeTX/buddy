import { MockedProvider } from "@apollo/client/testing";
import React from "react";
import { render } from "test-utils/testing-library";
import DeviceSummary from "renderer/components/devices/DeviceSummary";
import { deviceQuery } from "test-utils/mocks";
import { exampleDevices } from "test-utils/data";
import { screen } from "@testing-library/react";
import snapshotDiff from "snapshot-diff";

const device = exampleDevices[4]!;

describe("<DeviceSummary />", () => {
  it("should show details about the given device", async () => {
    const { asFragment } = render(
      <MockedProvider mocks={[deviceQuery(0)]}>
        <DeviceSummary deviceId="1" />
      </MockedProvider>
    );

    const productName = await screen.findByText(device.productName);
    expect(productName).toBeVisible();
    expect(
      screen.getByText(`${device.vendorId}:${device.productId}`)
    ).toBeVisible();
    expect(screen.getByText(device.serialNumber)).toBeVisible();

    expect(asFragment()).toMatchSnapshot();
  });

  it("should show loading skeleton before displaying device text", async () => {
    const { asFragment } = render(
      <MockedProvider mocks={[deviceQuery(100)]}>
        <DeviceSummary deviceId="1" />
      </MockedProvider>
    );

    const before = asFragment();
    await screen.findByText(device.productName);
    const after = asFragment();

    expect(snapshotDiff(before, after)).toMatchSnapshot();
  });
});
