import Typography from "@mui/material/Typography";
import React, { useEffect, useState } from "react";
import FormControl from "@mui/material/FormControl";
import RadioGroup from "@mui/material/RadioGroup";
import Radio from "@mui/material/Radio";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";
import LinearProgress from "@mui/material/LinearProgress";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Button from "@mui/material/Button";
import { gql, useQuery } from "@apollo/client";
import FormGroup from "@mui/material/FormGroup";
import Checkbox from "@mui/material/Checkbox";
import Markdown from "renderer/components/Markdown";

type Props = {
  onFirmwareProvided: (firmware: Buffer) => void;
  onIncludePrereleases: (enabled: boolean) => void;
  onVersionSelected: (version?: string) => void;
  onTargetSelected: (target?: string) => void;
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
  const releasesQuery = useQuery(
    gql(/* GraphQL */ `
      query Releases {
        edgeTxReleases {
          id
          name
          isPrerelease
        }
      }
    `)
  );

  const releaseTargetsQuery = useQuery(
    gql(/* GraphQL */ `
      query ReleaseTargets($tagName: ID!) {
        edgeTxRelease(id: $tagName) {
          id
          firmwareBundle {
            id
            targets {
              id
              name
            }
          }
        }
      }
    `),
    {
      skip: !version,
      variables: {
        tagName: version ?? "",
      },
    }
  );

  const releases = releasesQuery.data?.edgeTxReleases.filter(
    (release) => !!includePrereleases || !release.isPrerelease
  );

  const selectedFirmware = releases?.find((release) => release.id === version);
  const targets =
    releaseTargetsQuery.data?.edgeTxRelease?.firmwareBundle.targets;
  useEffect(() => {
    if (targets && target && !targets.find((t) => t.id === target)) {
      onTargetSelected(undefined);
    }
  }, [targets, target, onTargetSelected]);

  return (
    <>
      <FormControl
        fullWidth
        sx={{ m: 1 }}
        error={!!releasesQuery.error}
        disabled={releasesQuery.loading || !!releasesQuery.error}
      >
        <InputLabel id="select-version-label">Select version</InputLabel>
        <Select
          labelId="select-version-label"
          id="select-version"
          label="Select version"
          value={version}
          onChange={(e) => onVersionSelected(e.target.value)}
        >
          {releases?.map((release) => (
            <MenuItem key={release.id} value={release.id}>
              {release.name}
            </MenuItem>
          ))}
        </Select>
        {releasesQuery.error && (
          <FormHelperText>Could not load releases</FormHelperText>
        )}
      </FormControl>
      <FormControl
        fullWidth
        sx={{ m: 1 }}
        color="secondary"
        error={!!releaseTargetsQuery.error}
        disabled={
          !selectedFirmware ||
          releaseTargetsQuery.loading ||
          !!releaseTargetsQuery.error
        }
      >
        <InputLabel id="select-target-label">Select radio type</InputLabel>
        <Select
          labelId="select-target-label"
          id="select-target"
          label="Select radio type"
          value={target}
          onChange={(e) => onTargetSelected(e.target.value)}
        >
          {targets?.map((t) => (
            <MenuItem value={t.id}>{t.name}</MenuItem>
          ))}
        </Select>
        {releaseTargetsQuery.error && (
          <FormHelperText>Could not load targets</FormHelperText>
        )}
        {releaseTargetsQuery.loading && (
          <FormHelperText>
            <LinearProgress />
          </FormHelperText>
        )}
      </FormControl>
      <FormControl sx={{ m: 3 }} component="fieldset" variant="standard">
        <FormGroup>
          <FormControlLabel
            control={
              <Checkbox
                checked={!!includePrereleases}
                onChange={(e) => {
                  onIncludePrereleases(e.target.checked);
                }}
              />
            }
            label="Include prereleases"
          />
        </FormGroup>
      </FormControl>
    </>
  );
};

const FirmwareDescription: React.FC<{ version: string }> = ({ version }) => {
  const { data } = useQuery(
    gql(/* GraphQL */ `
      query ReleaseDescription($tagName: ID!) {
        edgeTxRelease(id: $tagName) {
          id
          description
        }
      }
    `),
    {
      variables: {
        tagName: version,
      },
    }
  );

  const description = data?.edgeTxRelease?.description;

  if (!description) {
    return null;
  }

  return <Markdown>{description}</Markdown>;
};

const SelectFirmware: React.FC<Props> = (props) => {
  const { version, target, onTargetSelected, onFirmwareProvided } = props;
  const [firmwareType, setFirmwareType] = useState<FirmwareType>("releases");

  useEffect(() => {
    if (version === "local") {
      setFirmwareType("local");
    }
  }, [version, setFirmwareType]);

  useEffect(() => {
    if (firmwareType === "local" && target) {
      onTargetSelected(undefined);
    }
  }, [firmwareType, target, onTargetSelected]);

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
          {/* eslint-disable-next-line react/jsx-props-no-spreading */}
          {firmwareType === "releases" && <FirmwarePicker {...props} />}
          {firmwareType === "local" && (
            <Button variant="contained" component="label">
              Select firmware file
              <input
                type="file"
                hidden
                onChange={async (event) => {
                  if (!event.target.files?.[0]) {
                    return;
                  }

                  onFirmwareProvided(
                    Buffer.from(await event.target.files[0].arrayBuffer())
                  );
                }}
              />
            </Button>
          )}
        </Grid>
      </Grid>
      <Box height="100%">
        {version && <FirmwareDescription version={version} />}
      </Box>
    </Box>
  );
};

export default SelectFirmware;
