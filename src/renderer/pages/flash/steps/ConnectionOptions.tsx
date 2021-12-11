import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import React, { useEffect } from "react";
import Button from "@mui/material/Button";
import { gql, useMutation, useQuery } from "@apollo/client";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormHelperText from "@mui/material/FormHelperText";
import LinearProgress from "@mui/material/LinearProgress";
import config from "shared/config";

type Props = {
  deviceId?: string;
  onDeviceSelected: (id?: string) => void;
};

const AvailableDevicesQueryDocument = gql(/* GraphQL */ `
  query AvailableDevices {
    flashableDevices {
      id
      productName
    }
  }
`);

const ConnectionOptions: React.FC<Props> = ({ deviceId, onDeviceSelected }) => {
  const availableDevicesQuery = useQuery(AvailableDevicesQueryDocument);
  const availableDevices = availableDevicesQuery.data?.flashableDevices;

  const [requestDevice] = useMutation(
    gql(/* GraphQL */ `
      mutation RequestDevice {
        requestFlashableDevice {
          id
        }
      }
    `),
    {
      refetchQueries: [AvailableDevicesQueryDocument],
    }
  );

  useEffect(() => {
    if (
      deviceId &&
      !availableDevicesQuery.loading &&
      !availableDevices?.find((device) => device.id === deviceId)
    ) {
      onDeviceSelected(undefined);
    }
  }, [
    availableDevices,
    availableDevicesQuery.loading,
    deviceId,
    onDeviceSelected,
  ]);
  return (
    <Box>
      <Typography variant="h2">Configure connection</Typography>
      <Box sx={{ p: 2 }}>
        {!config.isElectron ? (
          /** For the browser, we have to select the device by clicking a button */
          <FormControl fullWidth sx={{ m: 1 }}>
            <FormControlLabel
              control={
                <Button
                  variant="contained"
                  onClick={async () => {
                    const result = await requestDevice();
                    if (result.data?.requestFlashableDevice) {
                      onDeviceSelected(result.data.requestFlashableDevice.id);
                    }
                  }}
                >
                  Select device
                </Button>
              }
              label={deviceId ?? ""}
            />
          </FormControl>
        ) : (
          /** But in electron we can select from a list */
          <FormControl
            fullWidth
            sx={{ m: 1 }}
            error={!!availableDevicesQuery.error}
            disabled={
              availableDevicesQuery.loading || !!availableDevicesQuery.error
            }
          >
            <InputLabel id="select-device-label">Select device</InputLabel>
            <Select
              labelId="select-device-label"
              id="select-device"
              label="Select device"
              value={deviceId}
              onChange={(e) => onDeviceSelected(e.target.value)}
            >
              {availableDevices?.map((device) => (
                <MenuItem value={device.id}>{device.productName}</MenuItem>
              ))}
            </Select>
            {availableDevicesQuery.error && (
              <FormHelperText>Could not load usb device list</FormHelperText>
            )}
            {availableDevicesQuery.loading && (
              <FormHelperText>
                <LinearProgress />
              </FormHelperText>
            )}
          </FormControl>
        )}
      </Box>
    </Box>
  );
};

export default ConnectionOptions;
