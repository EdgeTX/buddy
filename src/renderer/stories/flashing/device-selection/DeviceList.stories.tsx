import React from "react";
import DeviceList from "renderer/pages/flash/v2/components/DeviceList";
import { exampleDevices } from "test-utils/data";
import { action } from "@storybook/addon-actions";

export default {
  title: "Flashing/Device Selection/DeviceList",
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
