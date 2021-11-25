import Typography from "@mui/material/Typography";
import React, { useEffect, useState } from "react";
import FormControl from "@mui/material/FormControl";
import RadioGroup from "@mui/material/RadioGroup";
import Radio from "@mui/material/Radio";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Button from "@mui/material/Button";
import { gql, useQuery } from "@apollo/client";
import githubClient from "../../../gql/github";
import { isNotNullOrUndefined } from "type-guards";

type Props = {
  onFirmwareProvided: (firmware: Buffer) => void;
  onIncludePrereleases: (enabled: boolean) => void;
  onVersionSelected: (version: string) => void;
  onTargetSelected: (target: string) => void;
  includePrereleases?: boolean;
  target?: string;
  version?: string;
};

type FirmwareType = "releases" | "branch" | "commit" | "pull-request" | "local";

const FirmwarePicker: React.FC<
  Pick<
    Props,
    | "onTargetSelected"
    | "onVersionSelected"
    | "onIncludePrereleases"
    | "target"
    | "version"
    | "includePrereleases"
  >
> = ({
  onTargetSelected,
  target,
  onVersionSelected,
  version,
  onIncludePrereleases,
  includePrereleases,
}) => {
  const { data, error, loading } = useQuery(
    gql(/* GraphQL */ `
      query Releases {
        repository(name: "edgetx", owner: "EdgeTX") {
          releases(first: 100) {
            nodes {
              tagName
              name
              description
              isPrerelease
            }
          }
        }
      }
    `),
    {
      client: githubClient,
    }
  );

  const releases = data?.repository?.releases.nodes
    ?.filter(isNotNullOrUndefined)
    .filter((release) => includePrereleases || !release.isPrerelease);

  const selectedFirmware = releases?.find(
    (release) => release.tagName === version
  );
  console.log(selectedFirmware);

  return (
    <>
      <FormControl
        fullWidth
        sx={{ m: 1 }}
        error={!!error}
        disabled={loading || !!error}
      >
        <InputLabel id="demo-simple-select-label">Select version</InputLabel>
        <Select
          labelId="demo-simple-select-label"
          id="demo-simple-select"
          label="Select version"
          value={version}
          onChange={(e) => onVersionSelected(e.target.value as string)}
        >
          {releases?.map((release) => (
            <MenuItem key={release.tagName} value={release.tagName}>
              {release.name ?? release.tagName}
            </MenuItem>
          ))}
        </Select>
        {error && <FormHelperText>Could not load releases</FormHelperText>}
      </FormControl>
      <FormControl fullWidth sx={{ m: 1 }} disabled={!selectedFirmware}>
        <InputLabel id="demo-simple-select-label-2">Select radio type</InputLabel>
        <Select
          labelId="demo-simple-select-label-2"
          id="demo-simple-select-2"
          label="Select radio type"
          value={target}
          onChange={(e) => onTargetSelected(e.target.value as string)}
        >
          <MenuItem value="nv14">Flysky Nirvana</MenuItem>
        </Select>
      </FormControl>
    </>
  );
};

const SelectFirmware: React.FC<Props> = (props) => {
  const [firmwareType, setFirmwareType] = useState<FirmwareType>("releases");

  useEffect(() => {
    if (props.target === "local") {
      setFirmwareType("local");
    }
  }, [props.target]);

  return (
    <Box>
      <Typography variant="h2">Select firmware</Typography>
      <Grid container spacing={2} sx={{ p: 2 }}>
        <Grid item xs={4}>
          <FormControl component="fieldset">
            <RadioGroup
              aria-label="firmware-type"
              defaultValue="releases"
              name="radio-buttons-group"
              value={firmwareType}
              onChange={(_, value) => {
                setFirmwareType(value as FirmwareType);
              }}
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
          {firmwareType === "releases" && <FirmwarePicker {...props} />}
          {firmwareType === "local" && (
            <Button variant="contained" component="label">
              Select firmware file
              <input
                type="file"
                hidden
                onChange={async (event) => {
                  props.onFirmwareProvided(
                    Buffer.from(await event.target.files![0]!.arrayBuffer())
                  );
                }}
              />
            </Button>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default SelectFirmware;
