import { UnlockOutlined } from "@ant-design/icons";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Button, message } from "antd";
import React from "react";
import { useTranslation } from "react-i18next";
import DeviceSelector from "renderer/components/devices/DeviceSelector";
import useQueryParams from "renderer/hooks/useQueryParams";
import {
  Centered,
  FullHeight,
  FullHeightCentered,
} from "renderer/shared/layouts";

const FlashUnlocker: React.FC = () => {
  const { t } = useTranslation("flashing");

  const { parseParam, updateParams } = useQueryParams();
  const selectedDeviceId = parseParam("deviceId");

  const [unprotectDevice, { loading }] = useMutation(
    gql(/* GraphQL */ `
      mutation UnprotectDevice($deviceId: ID!) {
        unprotectDevice(deviceId: $deviceId)
      }
    `)
  );

  const { refetch } = useQuery(
    gql(/* GraphQL */ `
      query Devices {
        flashableDevices {
          id
          productName
          serialNumber
          vendorId
          productId
        }
      }
    `)
  );

  return (
    <FullHeight style={{ padding: 16 }}>
      <FullHeightCentered>
        <DeviceSelector
          disabled={loading}
          selectedDeviceId={selectedDeviceId}
          onChange={(deviceId) => {
            updateParams({
              deviceId,
            });
          }}
        />
        <Centered>
          <Button
            icon={<UnlockOutlined />}
            type="primary"
            disabled={!selectedDeviceId}
            loading={loading}
            onClick={() => {
              if (!selectedDeviceId) {
                return;
              }

              void unprotectDevice({
                variables: {
                  deviceId: selectedDeviceId,
                },
              })
                .then(() => {
                  void message.success(
                    t(
                      `Device successfully unlocked! You will need to re-enter DFU mode to continue flashing`
                    ),
                    5
                  );
                })
                .catch((e) => {
                  void message.error(
                    t(`Could not unlock device: {{message}}`, {
                      message: (e as Error).message,
                    })
                  );
                })
                .finally(() => {
                  void refetch().catch(() => {});
                });
            }}
          >
            {t(`Remove flash protection`)}
          </Button>
        </Centered>
      </FullHeightCentered>
    </FullHeight>
  );
};

export default FlashUnlocker;
