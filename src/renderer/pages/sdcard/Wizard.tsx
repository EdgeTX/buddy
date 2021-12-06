import { gql, useMutation, useQuery } from "@apollo/client";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import React, { useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useQueryParams from "../../hooks/useQueryParams";

const SdcardWizard: React.FC = () => {
  const navigate = useNavigate();
  const { updateParams, parseParam } = useQueryParams([
    "target",
    "sounds",
    "folder",
    "erase",
  ]);

  const target = parseParam("target");
  const folder = parseParam("folder");
  const sounds = parseParam("sounds");

  const sdcardTargetsQuery = useQuery(
    gql(/* GraphQL */ `
      query SdcardTargets {
        sdcardTargets {
          id
          name
          tag
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
          tag
        }
      }
    `)
  );

  const [pickFolder, pickFolderMutation] = useMutation(
    gql(/* GraphQL */ `
      mutation PickSdcardFolder {
        pickSdcardFolder {
          id
          name
        }
      }
    `)
  );

  const [createWriteJob] = useMutation(
    gql(/* GraphQL */ `
      mutation CreateSdcardWriteJob(
        $folderId: ID!
        $target: ID!
        $sounds: ID!
        $clean: Boolean
      ) {
        createSdcardWriteJob(
          target: $target
          sounds: $sounds
          clean: $clean
          folderId: $folderId
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
          onChange={(e) => updateParams({ target: e.target.value as string })}
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
            updateParams({ sounds: e.target.value as string });
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
      <Button
        onClick={() =>
          pickFolder().then((result) => {
            if (result.data?.pickSdcardFolder) {
              updateParams({ folder: result.data.pickSdcardFolder.id });
            }
          })
        }
      >
        Select directory
      </Button>
      <Button
        disabled={!selectedTargetExists || !selectedSoundsExists}
        onClick={() => {
          if (folder && target && sounds)
            createWriteJob({
              variables: {
                folderId: folder,
                target,
                sounds,
                // TODO: don't clean
                clean: false,
              },
            }).then((result) => {
              if (result.data?.createSdcardWriteJob.id) {
                navigate(`/sdcard/${result.data?.createSdcardWriteJob.id}`);
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
