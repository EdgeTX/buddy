import { UsbOutlined } from "@ant-design/icons";
import { Skeleton, Space, Typography } from "antd";
import React from "react";
import { Centered } from "renderer/shared/layouts";
import { Device } from "renderer/pages/flash/types";

const DeviceSummary: React.FC<{ device?: Device; loading?: boolean }> = ({
  device,
  loading,
}) => (
  <Space direction="vertical" size="large" style={{ width: "100%" }}>
    <Centered>
      <UsbOutlined
        style={{
          fontSize: "60px",
          marginBottom: "8px",
        }}
      />
    </Centered>

    {loading ? (
      <Skeleton title active />
    ) : (
      <Centered>
        <Typography.Title style={{ textAlign: "center" }} level={5}>
          {device?.productName ?? "-"}
        </Typography.Title>
        <div>
          <Typography.Text style={{ textAlign: "center" }} type="secondary">
            {device?.serialNumber ?? "-"}
          </Typography.Text>
        </div>
        <div>
          <Typography.Text style={{ textAlign: "center" }} type="secondary">
            {device?.vendorId ?? "-"}:{device?.productId ?? "-"}
          </Typography.Text>
        </div>
      </Centered>
    )}
  </Space>
);

export default DeviceSummary;
