import { MockedProvider } from "@apollo/client/testing";
import { Card } from "antd";
import React from "react";
import DeviceSummary from "renderer/components/devices/DeviceSummary";
import { Centered } from "renderer/shared/layouts";
import { deviceQuery } from "test-utils/mocks";

export default {
  title: "Flashing/components/DeviceSummary",
  component: DeviceSummary,
};

export const example: React.FC = () => (
  <MockedProvider mocks={[deviceQuery]}>
    <DeviceSummary deviceId="1" />
  </MockedProvider>
);

export const inCard: React.FC = () => (
  <MockedProvider mocks={[deviceQuery]}>
    <Card style={{ width: 500 }}>
      <Centered>
        <DeviceSummary deviceId="1" />
      </Centered>
    </Card>
  </MockedProvider>
);
