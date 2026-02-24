import React from "react";
import { render } from "test-utils/testing-library";
import DeviceList from "renderer/components/devices/DeviceList";
import { exampleDevices } from "test-utils/data";
import { screen } from "@testing-library/react";
import snapshotDiff from "snapshot-diff";

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

  it("should allow device list to be disabled", () => {
    const device = exampleDevices[0]!;
    const { rerender, asFragment } = render(<DeviceList devices={[device]} />);

    const before = asFragment();

    rerender(<DeviceList devices={[device]} disabled />);

    expect(snapshotDiff(before, asFragment())).toMatchInlineSnapshot(`
      "Snapshot Diff:
      - First value
      + Second value

      @@ -1,9 +1,9 @@
        <DocumentFragment>
          <div
            class="ant-list ant-list-lg ant-list-split css-dev-only-do-not-override-1yacf91"
      -     style="height: 100%; min-width: 350px;"
      +     style="height: 100%; min-width: 350px; opacity: 0.5; pointer-events: none;"
          >
            <div
              class="ant-spin-nested-loading css-dev-only-do-not-override-1yacf91"
            >
              <div
      @@ -77,7 +77,6 @@
                  </li>
                </ul>
              </div>
            </div>
          </div>
      -   )
        </DocumentFragment>"
    `);
  });
});
