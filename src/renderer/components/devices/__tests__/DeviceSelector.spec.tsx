import { MockedProvider, MockedResponse } from "@apollo/client/testing";
import React from "react";
import { render } from "test-utils/testing-library";
import DeviceSelector from "renderer/components/devices/DeviceSelector";
import { devicesQuery } from "test-utils/mocks";
import { exampleDevices } from "test-utils/data";
import { fireEvent, screen, waitFor } from "@testing-library/react";

import gql from "gql";

describe("<DeviceSelector />", () => {
  it("should show devices connected via USB", async () => {
    render(
      <MockedProvider mocks={[devicesQuery(100)]}>
        <DeviceSelector />
      </MockedProvider>
    );
    await screen.findByText(exampleDevices[0]!.productName);

    expect(
      screen.getByText(`Available devices (${exampleDevices.length})`)
    ).toBeVisible();
    exampleDevices.forEach((device) => {
      expect(screen.getByText(device.productName)).toBeVisible();
    });
  });

  it("should allow a device to be selected", async () => {
    const onChange = vitest.fn();
    const { rerender } = render(
      <MockedProvider mocks={[devicesQuery(0)]}>
        <DeviceSelector onChange={onChange} />
      </MockedProvider>
    );

    const item = await screen.findByText(exampleDevices[3]!.productName);
    expect(screen.queryByRole("row", { selected: true })).toBeFalsy();

    fireEvent.click(item);
    expect(onChange).toHaveBeenCalledWith(exampleDevices[3]!.id);

    rerender(
      <MockedProvider mocks={[devicesQuery(0)]}>
        <DeviceSelector
          onChange={onChange}
          selectedDeviceId={exampleDevices[3]!.id}
        />
      </MockedProvider>
    );

    expect(screen.getByRole("row", { selected: true })).toHaveTextContent(
      exampleDevices[3]!.productName
    );
  });

  it("should set the selected device to undefined if the device doesnt exist in the device list", async () => {
    const onChange = vitest.fn();
    render(
      <MockedProvider mocks={[devicesQuery(0)]}>
        <DeviceSelector
          onChange={onChange}
          selectedDeviceId="some-non-exist-device"
        />
      </MockedProvider>
    );

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(undefined));
  });

  describe("in the web", () => {
    it("should request a device from the browser when add device is clicked", async () => {
      const requestDeviceQuery: MockedResponse = {
        request: {
          query: gql(`
            mutation RequestDevice {
              requestFlashableDevice {
                id
              }
            }
          `),
        },
        result: {
          data: {
            requestFlashableDevice: {
              id: exampleDevices[2]!.id,
            },
          },
        },
      };

      const onChange = vitest.fn();

      render(
        <MockedProvider
          mocks={[
            devicesQuery(0, []),
            requestDeviceQuery,
            devicesQuery(0, [exampleDevices[2]!]),
          ]}
        >
          <DeviceSelector variant="web" onChange={onChange} />
        </MockedProvider>
      );

      expect(
        await screen.findByText("Add a device to get started")
      ).toBeVisible();
      expect(screen.queryByText("No devices found")).toBeFalsy();
      fireEvent.click(screen.getByText("Add new device"));

      expect(await screen.findByRole("row")).toHaveTextContent(
        exampleDevices[2]!.productName
      );
      expect(onChange).toHaveBeenCalledWith(exampleDevices[2]!.id);
    });

    it("should disable add device button when disabled", async () => {
      const requestDeviceQuery: MockedResponse = {
        request: {
          query: gql(`
            mutation RequestDevice {
              requestFlashableDevice {
                id
              }
            }
          `),
        },
        result: {
          data: {
            requestFlashableDevice: {
              id: exampleDevices[2]!.id,
            },
          },
        },
      };

      const onChange = vitest.fn();

      render(
        <MockedProvider
          mocks={[
            devicesQuery(0, []),
            requestDeviceQuery,
            devicesQuery(0, [exampleDevices[2]!]),
          ]}
        >
          <DeviceSelector variant="web" onChange={onChange} disabled />
        </MockedProvider>
      );

      const addDeviceButton = await screen.findByRole("button");
      expect(addDeviceButton).toHaveTextContent("Add new device");
      expect(addDeviceButton).toBeDisabled();
      fireEvent.click(screen.getByText("Add new device"));
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("in electron", () => {
    it("should allow the device list to be refreshed", async () => {
      render(
        <MockedProvider
          mocks={[
            devicesQuery(0, []),
            devicesQuery(0, exampleDevices.slice(0, 2)),
          ]}
        >
          <DeviceSelector variant="electron" />
        </MockedProvider>
      );

      expect(await screen.findByText("No devices found")).toBeVisible();
      fireEvent.click(screen.getByText("Refresh"));

      expect(await screen.findByText(`Available devices (2)`)).toBeVisible();
    });

    it("should disable refresh button when disabled", async () => {
      render(
        <MockedProvider
          mocks={[
            devicesQuery(0, []),
            devicesQuery(0, exampleDevices.slice(0, 2)),
          ]}
        >
          <DeviceSelector variant="electron" disabled />
        </MockedProvider>
      );

      expect(await screen.findByText("No devices found")).toBeVisible();

      const refreshButton = screen.getByRole("button");
      expect(refreshButton).toHaveTextContent("Refresh");
      expect(refreshButton).toBeDisabled();
      fireEvent.click(screen.getByText("Refresh"));

      expect(await screen.findByText("No devices found")).toBeVisible();
    });
  });
});
