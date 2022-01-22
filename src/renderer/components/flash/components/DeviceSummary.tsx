import { UsbOutlined } from "@ant-design/icons";
import { Skeleton, Space, Typography } from "antd";
import React from "react";
import { Centered } from "renderer/shared/layouts";
import { Device } from "renderer/components/flash/types";
import { gql, useQuery } from "@apollo/client";

const DeviceDetails: React.FC<{ device?: Device; loading?: boolean }> = ({
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
      <Skeleton title paragraph={{ rows: 2 }} active />
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

const DeviceSummary: React.FC<{ deviceId: string }> = ({ deviceId }) => {
  const { loading, data } = useQuery(
    gql(/* GraphQL */ `
      query DeviceInfo($deviceId: ID!) {
        flashableDevice(id: $deviceId) {
          id
          productName
          serialNumber
          vendorId
          productId
        }
      }
    `),
    {
      variables: {
        deviceId,
      },
    }
  );

  return (
    <DeviceDetails
      loading={loading}
      device={data?.flashableDevice ?? undefined}
    />
  );
};

export default DeviceSummary;
