import { gql, useMutation, useQuery } from "@apollo/client";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import FormHelperText from "@mui/material/FormHelperText";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import React from "react";
import { useNavigate } from "react-router-dom";
import useQueryParams from "renderer/hooks/useQueryParams";

const SdcardWizard: React.FC = () => {
  const navigate = useNavigate();
  const { updateParams, parseParam } = useQueryParams<
    "target" | "sounds" | "directory" | "clean"
  >();

  const target = parseParam("target");
  const directory = parseParam("directory");
  const sounds = parseParam("sounds");
  const clean = parseParam("clean", Boolean);

  const sdcardTargetsQuery = useQuery(
    gql(/* GraphQL */ `
      query SdcardTargets {
        sdcardTargets {
          id
          name
        }
      }
    `)
  );
  const sdcardSoundsQuery = useQuery(
    gql(/* GraphQL */ `
      query SdcardSounds {
        sdcardSounds {
          id
          name
        }
      }
    `)
  );

  const [pickFolder] = useMutation(
    gql(/* GraphQL */ `
      mutation PickSdcardDirectoryWithName {
        pickSdcardDirectory {
          id
          name
        }
      }
    `)
  );

  const [createWriteJob] = useMutation(
    gql(/* GraphQL */ `
      mutation CreateSdcardWriteJob(
        $directoryId: ID!
        $target: ID!
        $sounds: ID!
        $clean: Boolean
      ) {
        createSdcardWriteJob(
          target: $target
          sounds: $sounds
          clean: $clean
          directoryId: $directoryId
        ) {
          id
        }
      }
    `)
  );

  const targets = sdcardTargetsQuery.data?.sdcardTargets;
  const availableSounds = sdcardSoundsQuery.data?.sdcardSounds;

  const selectedTargetExists = !!targets?.find(({ id }) => id === target);
  const selectedSoundsExists = !!availableSounds?.find(
    ({ id }) => id === sounds
  );

  return (
    <Box height="100%" sx={{ display: "flex", flexDirection: "column" }}>
      <Typography variant="h2">Sdcard wizard</Typography>
      <FormControl
        fullWidth
        sx={{ m: 1 }}
        error={!!sdcardTargetsQuery.error}
        disabled={sdcardTargetsQuery.loading || !!sdcardTargetsQuery.error}
      >
        <InputLabel id="select-radio-label">Select radio</InputLabel>
        <Select
          labelId="select-radio-label"
          id="select-radio"
          label="Select radio"
          value={target}
          onChange={(e) => updateParams({ target: e.target.value })}
        >
          {targets?.map((radio) => (
            <MenuItem key={radio.id} value={radio.id}>
              {radio.name}
            </MenuItem>
          ))}
        </Select>
        {sdcardTargetsQuery.error && (
          <FormHelperText>Could not load targets</FormHelperText>
        )}
      </FormControl>
      <FormControl
        fullWidth
        sx={{ m: 1 }}
        color="secondary"
        error={!!sdcardSoundsQuery.error}
        disabled={sdcardSoundsQuery.loading || !!sdcardSoundsQuery.error}
      >
        <InputLabel id="select-language">Select language</InputLabel>
        <Select
          labelId="select-language-label"
          id="select-languaget"
          label="Select language"
          value={sounds}
          onChange={(e) => {
            updateParams({ sounds: e.target.value });
          }}
        >
          {availableSounds?.map((s) => (
            <MenuItem value={s.id}>{s.name}</MenuItem>
          ))}
        </Select>
        {sdcardSoundsQuery.error && (
          <FormHelperText>Could not load sounds</FormHelperText>
        )}
      </FormControl>
      <FormControl sx={{ m: 3 }} component="fieldset" variant="standard">
        <FormGroup>
          <FormControlLabel
            control={
              <Checkbox
                checked={!!clean}
                onChange={(e) => {
                  updateParams({ clean: e.target.checked });
                }}
              />
            }
            label="Erase before flashing"
          />
        </FormGroup>
      </FormControl>
      <Button
        onClick={() =>
          pickFolder().then((result) => {
            if (result.data?.pickSdcardDirectory) {
              updateParams({ directory: result.data.pickSdcardDirectory.id });
            }
          })
        }
      >
        Select directory
      </Button>
      <Button
        disabled={!selectedTargetExists || !selectedSoundsExists}
        onClick={() => {
          if (directory && target && sounds)
            void createWriteJob({
              variables: {
                directoryId: directory,
                target,
                sounds,
                clean: !!clean,
              },
            }).then((result) => {
              if (result.data?.createSdcardWriteJob.id) {
                navigate(`/sdcardv1/${result.data.createSdcardWriteJob.id}`);
              } else {
                console.log(result);
              }
            });
        }}
      >
        Make SD
      </Button>
    </Box>
  );
};

export default SdcardWizard;
