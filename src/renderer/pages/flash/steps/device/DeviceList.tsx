import { UsbOutlined } from "@ant-design/icons";
import { List, Skeleton, Typography } from "antd";
import React from "react";
import { times } from "shared/tools";
import { Device } from "renderer/pages/flash/types";
import SelectableItemList from "renderer/components/SelectableListItem";

type Props = {
  devices: Device[];
  loading?: boolean;
  selectedDeviceId?: string;
  onSelected?: (deviceId: string) => void;
};

const DeviceList: React.FC<Props> = ({
  devices,
  onSelected,
  selectedDeviceId,
  loading,
}) => (
  <List
    style={{
      height: "100%",
    }}
    itemLayout="horizontal"
    size="large"
    dataSource={
      loading
        ? times(3).map(
            (_, i) =>
              ({
                id: i.toString(),
                vendorId: i.toString(),
                productId: i.toString(),
              } as Device)
          )
        : devices
    }
    renderItem={(device) => (
      <Skeleton loading={!!loading} active avatar>
        <SelectableItemList
          selected={device.id === selectedDeviceId}
          key={device.id}
          onClick={() => {
            onSelected?.(device.id);
          }}
          actions={[
            <Typography.Text type="secondary">
              {device.vendorId}:{device.productId}
            </Typography.Text>,
          ]}
        >
          <List.Item.Meta
            avatar={<UsbOutlined style={{ fontSize: "24px" }} />}
            title={
              <Typography.Text>
                {device.productName ?? `${device.vendorId}:${device.productId}`}
              </Typography.Text>
            }
            description={device.serialNumber ?? "-"}
          />
        </SelectableItemList>
      </Skeleton>
    )}
  />
);

export default DeviceList;
