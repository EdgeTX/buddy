import React from "react";
import DeviceList from "renderer/components/flash/steps/device/DeviceList";
import { exampleDevices } from "test-utils/data";
import { action } from "@storybook/addon-actions";

export default {
  title: "Flashing/steps/Device Selection/DeviceList",
  component: DeviceList,
};

export const deviceNotSelected = () => (
  <DeviceList
    devices={exampleDevices}
    selectedDeviceId="1"
    onSelected={action("onSelected")}
  />
);

export const deviceSelected = () => (
  <DeviceList devices={exampleDevices} onSelected={action("onSelected")} />
);

export const loading = () => (
  <DeviceList
    loading
    devices={exampleDevices}
    selectedDeviceId="1"
    onSelected={action("onSelected")}
  />
);
