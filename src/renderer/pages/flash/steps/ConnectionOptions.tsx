import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import React from "react";
import Button from "@mui/material/Button";

type Props = {
  deviceId?: string;
  onDeviceSelected: (id?: string) => void;
};

const ConnectionOptions: React.FC<Props> = ({ deviceId, onDeviceSelected }) => (
  <Box>
    <Typography variant="h2">Configure connection</Typography>
    <Box sx={{ p: 2 }}>
      <FormControl fullWidth sx={{ m: 1 }}>
        <FormControlLabel
          control={
            <Button
              variant="contained"
              onClick={async () => {
                // TODO: use gql mutation for this
                const device = await navigator.usb
                  .requestDevice({ filters: [] })
                  .catch((e) => {
                    console.log(e);
                    return undefined;
                  });
                if (device) {
                  onDeviceSelected(
                    device.serialNumber ??
                      `${device.vendorId.toString()}:${device.productId.toString()}`
                  );
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

export default ConnectionOptions;
