import { UsbOutlined } from "@ant-design/icons";
import { Space, Typography } from "antd";
import React from "react";
import { Centered } from "renderer/pages/flash/v2/shared";
import { Device } from "renderer/pages/flash/v2/types";

const DeviceSummary: React.FC<{ device: Device }> = ({ device }) => (
  <Space direction="horizontal" size="large">
    <Centered>
      <UsbOutlined
        style={{
          fontSize: "64px",
        }}
      />
    </Centered>
    <div>
      <Typography.Title level={4}>{device.productName}</Typography.Title>
      <div>
        <Typography.Text type="secondary">
          {device.serialNumber ?? "-"}
        </Typography.Text>
      </div>
      <div>
        <Typography.Text type="secondary">
          {device.vendorId}:{device.productId}
        </Typography.Text>
      </div>
    </div>
  </Space>
);

export default DeviceSummary;
