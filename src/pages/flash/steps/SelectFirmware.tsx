import Typography from "@mui/material/Typography";
import React, { useEffect, useRef, useState } from "react";
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
import { ApolloError, gql, useQuery } from "@apollo/client";
import githubClient from "../../../gql/github";
import { isNotNullOrUndefined } from "type-guards";
import { firmwareTargets, Target } from "../../../store/firmware";
import Markdown from "../../../components/Markdown";

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

// TODO, this will be a resolver on our graphql server
// with a targets resolver
const useFirmwareTargets = (
  tagName?: string
): { targets?: Target[]; error?: ApolloError | Error; loading: boolean } => {
  const currentTagName = useRef<string>();
  currentTagName.current = tagName;
  const [targetsError, setTargetsError] = useState<Error>();
  const [targets, setTargets] = useState<Target[]>();

  const { data, error, loading } = useQuery(
    gql(/* GraphQL */ `
      query ReleaseAssets($tagName: String!) {
        repository(name: "edgetx", owner: "EdgeTX") {
          id
          release(tagName: $tagName) {
            id
            releaseAssets(first: 100) {
              nodes {
                id
                name
                url
              }
            }
          }
        }
      }
    `),
    {
      skip: !tagName,
      variables: {
        tagName: tagName ?? "",
      },
      client: githubClient,
    }
  );

  const fetchTargets = (firmwareBundleUrl: string) => {
    firmwareTargets(firmwareBundleUrl)
      .then((targets) => {
        if (tagName === currentTagName.current) {
          setTargets(targets);
        }
      })
      .catch((error) => {
        console.error(error);
        if (tagName === currentTagName.current) {
          setTargetsError(error);
        }
      });
  };

  useEffect(() => {
    if (data && !loading) {
      setTargets(undefined);
      setTargetsError(undefined);
      const firmwareBundleUrl = data.repository?.release?.releaseAssets?.nodes
        ?.filter(isNotNullOrUndefined)
        .find((asset) => asset.name.indexOf("firmware") > -1)?.url;

      if (!firmwareBundleUrl) {
        setTargetsError(new Error("Release doesn't have firmware bundle"));
        return;
      }

      fetchTargets(firmwareBundleUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, loading]);

  return {
    loading,
    error: error ?? targetsError,
    targets: !loading && data && !error ? targets : undefined,
  };
};

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
          id
          releases(first: 100) {
            nodes {
              id
              tagName
              name
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

  const {
    targets,
    error: errorLoadingTargets,
    loading: loadingTargets,
  } = useFirmwareTargets(selectedFirmware?.tagName);

  useEffect(() => {
    if (targets && target && !targets.find((t) => t.code === target)) {
      onTargetSelected(undefined);
    }
  }, [targets, target, onTargetSelected]);

  return (
    <>
      <FormControl
        fullWidth
        sx={{ m: 1 }}
        error={!!error}
        disabled={loading || !!error}
      >
        <InputLabel id="select-version-label">Select version</InputLabel>
        <Select
          labelId="select-version-label"
          id="select-version"
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
      <FormControl
        fullWidth
        sx={{ m: 1 }}
        error={!!errorLoadingTargets}
        disabled={!selectedFirmware || loadingTargets || !!errorLoadingTargets}
      >
        <InputLabel id="select-target-label">Select radio type</InputLabel>
        <Select
          labelId="select-target-label"
          id="select-target"
          label="Select radio type"
          value={target}
          onChange={(e) => onTargetSelected(e.target.value as string)}
        >
          {targets?.map((t) => (
            <MenuItem value={t.code}>{t.name}</MenuItem>
          ))}
        </Select>
        {errorLoadingTargets && (
          <FormHelperText>Could not load targets</FormHelperText>
        )}
      </FormControl>
    </>
  );
};

const FirmwareDescription: React.FC<{ version: string }> = ({ version }) => {
  const { data } = useQuery(
    gql(/* GraphQL */ `
      query ReleaseDescription($tagName: String!) {
        repository(name: "edgetx", owner: "EdgeTX") {
          id
          release(tagName: $tagName) {
            id
            description
          }
        }
      }
    `),
    {
      variables: {
        tagName: version,
      },
      client: githubClient,
    }
  );

  const description = data?.repository?.release?.description;

  if (!description) {
    return null;
  }

  return <Markdown children={description} />;
};

const SelectFirmware: React.FC<Props> = (props) => {
  const [firmwareType, setFirmwareType] = useState<FirmwareType>("releases");

  useEffect(() => {
    if (props.target === "local") {
      setFirmwareType("local");
    }
  }, [props.target]);

  useEffect(() => {
    if (firmwareType === "local") {
      props.onVersionSelected(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firmwareType]);

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
      <Box height="100%">
        {props.version && <FirmwareDescription version={props.version} />}
      </Box>
    </Box>
  );
};

export default SelectFirmware;
