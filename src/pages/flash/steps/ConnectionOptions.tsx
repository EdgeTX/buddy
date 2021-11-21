import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import Checkbox from "@mui/material/Checkbox";
import React from "react";
import Button from "@mui/material/Button";

type Props = {
  deviceId?: string;
  unprotectedFlashing?: boolean;
  onDeviceSelected: (id?: string) => void;
  onSetForceUnprotectedFlashing: (enabled: boolean) => void;
};

const ConnectionOptions: React.FC<Props> = ({
  deviceId,
  unprotectedFlashing,
  onDeviceSelected,
  onSetForceUnprotectedFlashing,
}) => (
  <Box>
    <Typography variant="h2">Configure connection</Typography>
    <FormControl fullWidth sx={{ m: 1 }}>
      <FormControlLabel
        control={
          <Checkbox
            checked={unprotectedFlashing}
            onChange={(_, checked) => onSetForceUnprotectedFlashing(checked)}
          />
        }
        label="Force unprotect flashing"
      />
    </FormControl>
    <FormControl fullWidth sx={{ m: 1 }}>
      <FormControlLabel
        control={
          <Button
            variant="contained"
            onClick={async () => {
              const device = await navigator.usb
                .requestDevice({ filters: [] })
                .catch((e) => {
                  console.log(e);
                  return undefined;
                });
              if (device) {
                onDeviceSelected(
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
);

export default ConnectionOptions;
