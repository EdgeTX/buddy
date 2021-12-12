import {
  PlusSquareOutlined,
  SyncOutlined,
  UsbOutlined,
} from "@ant-design/icons";
import { useQuery, gql, useMutation } from "@apollo/client";
import { Button, Card, Empty, Space, Typography } from "antd";
import React, { useEffect } from "react";
import useQueryParams from "renderer/hooks/useQueryParams";
import styled from "styled-components";
import DeviceList from "./components/DeviceList";
import {
  Centered,
  FullHeight,
  StepContentContainer,
  StepControlsContainer,
} from "./shared";
import { StepComponent } from "./types";

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
`;

const ButtonsContainer = styled.div`
  height: 32px;
`;

const DeviceSelectionArea = styled.div`
  /* TODO: Fix this massive hack */
  height: calc(100vh - 480px);
  overflow-y: auto;
`;

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

const DeviceSelectionStep: StepComponent<{
  variant: "web" | "electron";
}> = ({ variant, onNext, onPrevious }) => {
  const { parseParam, updateParams } = useQueryParams<"deviceId">();
  const selectedDeviceId = parseParam("deviceId");

  const { data, loading, refetch } = useQuery(DevicesQuery);

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
      updateParams({
        deviceId: undefined,
      });
    }
  }, [data, loading, selectedDeviceId, updateParams]);

  const devicesAvailable = (data?.flashableDevices.length ?? 0) > 0;
  const actionButton =
    variant === "electron" ? (
      <Button
        type={!devicesAvailable ? "primary" : undefined}
        icon={<SyncOutlined />}
        onClick={() => {
          void refetch();
        }}
      >
        Refresh
      </Button>
    ) : (
      <Button
        icon={<PlusSquareOutlined />}
        type={!devicesAvailable ? "primary" : undefined}
        onClick={() => {
          // Select the device after it's been picked, as it's likely
          // this is what the user wants
          void requestDevice().then((result) => {
            if (result.data?.requestFlashableDevice) {
              updateParams({ deviceId: result.data.requestFlashableDevice.id });
            }
          });
        }}
      >
        Add new device
      </Button>
    );

  return (
    <FullHeight>
      <StepContentContainer>
        <Main>
          <Typography.Text>
            Available devices ({data?.flashableDevices.length ?? 0})
          </Typography.Text>

          <Card>
            <DeviceSelectionArea>
              {loading || devicesAvailable ? (
                <DeviceList
                  devices={data?.flashableDevices ?? []}
                  loading={loading}
                  onSelected={(deviceId) => {
                    updateParams({ deviceId });
                  }}
                  selectedDeviceId={selectedDeviceId}
                />
              ) : (
                <Centered>
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
                        ? "No devices found"
                        : "Add a device to get started"
                    }
                  >
                    {actionButton}
                  </Empty>
                </Centered>
              )}
            </DeviceSelectionArea>
          </Card>
          <ButtonsContainer>
            {!loading && devicesAvailable && actionButton}
          </ButtonsContainer>
        </Main>
      </StepContentContainer>
      <StepControlsContainer>
        <Space>
          <Button
            type="primary"
            size="large"
            onClick={() => {
              if (selectedDeviceId) {
                onNext?.();
              }
            }}
          >
            Next
          </Button>
          <Button
            size="large"
            onClick={() => {
              onPrevious?.();
            }}
          >
            Previous
          </Button>
        </Space>
      </StepControlsContainer>
    </FullHeight>
  );
};

export default DeviceSelectionStep;
