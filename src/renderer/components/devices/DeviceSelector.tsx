import {
  PlusSquareOutlined,
  SyncOutlined,
  UsbOutlined,
} from "@ant-design/icons";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Button, Card, Empty, Typography } from "antd";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import useIsMobile from "renderer/hooks/useIsMobile";
import { Centered } from "renderer/shared/layouts";
import styled from "styled-components";
import DeviceList from "./DeviceList";

const Main = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  > * {
    width: 100%;
    max-width: 800px;
  }
  gap: 8px;
  min-height: 0;
`;

const ButtonsContainer = styled.div`
  height: 32px;
`;

type Props = {
  variant?: "electron" | "web";
  selectedDeviceId?: string;
  onChange?: (selectedDeviceId?: string) => void;
  disabled?: boolean;
};

const DevicesQuery = gql(/* GraphQL */ `
  query Devices {
    flashableDevices {
      id
      productName
      serialNumber
      vendorId
      productId
    }
  }
`);

const DeviceSelector: React.FC<Props> = ({
  selectedDeviceId,
  variant = "web",
  onChange,
  disabled,
}) => {
  const isMobile = useIsMobile();
  const { data, loading, refetch } = useQuery(DevicesQuery);
  const { t } = useTranslation("flashing");

  const [requestDevice] = useMutation(
    gql(/* GraphQL */ `
      mutation RequestDevice {
        requestFlashableDevice {
          id
        }
      }
    `),
    {
      refetchQueries: [DevicesQuery],
      awaitRefetchQueries: true,
    }
  );

  useEffect(() => {
    if (
      !loading &&
      selectedDeviceId &&
      !data?.flashableDevices.find((d) => d.id === selectedDeviceId)
    ) {
      onChange?.(undefined);
    }
  }, [data, loading, selectedDeviceId, onChange]);

  const devicesAvailable = (data?.flashableDevices.length ?? 0) > 0;
  const actionButton =
    variant === "electron" ? (
      <Button
        type={!devicesAvailable ? "primary" : undefined}
        icon={<SyncOutlined />}
        disabled={disabled}
        onClick={() => {
          void refetch();
        }}
      >
        {t(`Refresh`)}
      </Button>
    ) : (
      <Button
        icon={<PlusSquareOutlined />}
        type={!devicesAvailable ? "primary" : undefined}
        disabled={disabled}
        onClick={() => {
          // Select the device after it's been picked, as it's likely
          // this is what the user wants
          void requestDevice().then((result) => {
            if (result.data?.requestFlashableDevice) {
              onChange?.(result.data.requestFlashableDevice.id);
            }
          });
        }}
      >
        {t(`Add new device`)}
      </Button>
    );

  return (
    <Main>
      <Typography.Text>
        {t(`Available devices`)} ({data?.flashableDevices.length ?? 0})
      </Typography.Text>

      <Card
        style={{
          height: isMobile ? "300px" : "100%",
          overflowY: "auto",
        }}
        bodyStyle={{ height: "100%", padding: 8 }}
      >
        {loading || devicesAvailable ? (
          <DeviceList
            devices={data?.flashableDevices ?? []}
            loading={loading}
            onSelected={(deviceId) => {
              onChange?.(deviceId);
            }}
            selectedDeviceId={selectedDeviceId}
            disabled={disabled}
          />
        ) : (
          <Centered style={{ height: "100%" }}>
            <Empty
              imageStyle={{
                marginBottom: 0,
              }}
              image={
                <UsbOutlined
                  style={{
                    fontSize: "64px",
                    color: "#d9d9d9",
                  }}
                />
              }
              description={
                variant === "electron"
                  ? t(`No devices found`)
                  : t(`Add a device to get started`)
              }
            >
              {actionButton}
            </Empty>
          </Centered>
        )}
      </Card>
      <ButtonsContainer>
        {!loading && devicesAvailable && actionButton}
      </ButtonsContainer>
    </Main>
  );
};

export default DeviceSelector;
