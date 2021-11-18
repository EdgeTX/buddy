import Typography from "@mui/material/Typography";
import React from "react";
import FormControl from "@mui/material/FormControl";
import RadioGroup from "@mui/material/RadioGroup";
import Radio from "@mui/material/Radio";
import FormControlLabel from "@mui/material/FormControlLabel";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";

type Props = {
  onVersionSelected: (version: string) => void;
  onTargetSelected: (target: string) => void;
  target?: string;
  version?: string;
};

const SelectFirmware: React.FC<Props> = ({
  onVersionSelected,
  onTargetSelected,
  target,
  version,
}) => {
  return (
    <Box>
      <Typography variant="h2">Select firmware</Typography>
      <Grid container spacing={2} sx={{ p: 2 }}>
        <Grid item xs={4}>
          <FormControl component="fieldset">
            <RadioGroup
              aria-label="gender"
              defaultValue="releases"
              name="radio-buttons-group"
            >
              <FormControlLabel
                value="releases"
                control={<Radio />}
                label="Official releases"
              />
              <FormControlLabel
                value="branch"
                control={<Radio />}
                label="Git branch"
              />
              <FormControlLabel
                value="commit"
                control={<Radio />}
                label="Git commit"
              />
              <FormControlLabel
                value="pull-request"
                control={<Radio />}
                label="Pull request"
              />
              <FormControlLabel
                value="local"
                control={<Radio />}
                label="Firmware file"
              />
            </RadioGroup>
          </FormControl>
        </Grid>
        <Grid item xs={8}>
          <FormControl fullWidth sx={{ m: 1 }}>
            <InputLabel id="demo-simple-select-label">Version</InputLabel>
            <Select
              labelId="demo-simple-select-label"
              id="demo-simple-select"
              label="Version"
              value={version}
              onChange={(e) => onVersionSelected(e.target.value as string)}
            >
              <MenuItem value="1.25.0">v1.25.0</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ m: 1 }}>
            <InputLabel id="demo-simple-select-label-2">Target</InputLabel>
            <Select
              labelId="demo-simple-select-label-2"
              id="demo-simple-select-2"
              label="Target"
              value={target}
              onChange={(e) => onTargetSelected(e.target.value as string)}
            >
              <MenuItem value="nv14">Flysky Nirvana</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SelectFirmware;
