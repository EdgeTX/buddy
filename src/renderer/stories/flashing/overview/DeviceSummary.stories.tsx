import { Card } from "antd";
import React from "react";
import DeviceSummary from "renderer/pages/flash/v2/components/DeviceSummary";
import { Centered } from "renderer/pages/flash/v2/shared";
import { exampleDevices } from "test-utils/data";

export default {
  title: "Flashing/Overview/DeviceSummary",
  component: DeviceSummary,
};

export const example: React.FC = () => (
  <DeviceSummary device={exampleDevices[0]!} />
);

export const inCard: React.FC = () => (
  <Card style={{ width: 500 }}>
    <Centered>
      <DeviceSummary device={exampleDevices[0]!} />
    </Centered>
  </Card>
);
