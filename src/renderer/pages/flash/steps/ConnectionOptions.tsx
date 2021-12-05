import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import React, { useEffect } from "react";
import Button from "@mui/material/Button";
import { gql, useMutation, useQuery } from "@apollo/client";

type Props = {
  deviceId?: string;
  onDeviceSelected: (id?: string) => void;
};

const AvailableDevicesQuery = gql(/* GraphQL */ `
  query AvailableDevices {
    flashableDevices {
      id
      name
    }
  }
`);

const ConnectionOptions: React.FC<Props> = ({ deviceId, onDeviceSelected }) => {
  const { data, loading } = useQuery(AvailableDevicesQuery);
  const devices = data?.flashableDevices;

  const [requestDevice] = useMutation(
    gql(/* GraphQL */ `
      mutation RequestDevice {
        requestFlashableDevice {
          id
        }
      }
    `),
    {
      refetchQueries: [AvailableDevicesQuery],
    }
  );

  useEffect(() => {
    if (
      deviceId &&
      !loading &&
      !devices?.find((device) => device.id === deviceId)
    ) {
      onDeviceSelected(undefined);
    }
  }, [devices, loading, deviceId]);
  return (
    <Box>
      <Typography variant="h2">Configure connection</Typography>
      <Box sx={{ p: 2 }}>
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
      </Box>
    </Box>
  );
};

export default ConnectionOptions;
