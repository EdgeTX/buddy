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
import { isNotNullOrUndefined } from "type-guards";
import { unzipRaw } from "unzipit";

const SdcardWizard: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<string>();
  const logBoxRef = useRef<HTMLElement | null>(null);
  const log = (line: string) =>
    setLogs((existingLogs) => existingLogs.concat([line]));

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
        $sounds: String!
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
  const selectedFolder = pickFolderMutation.data?.pickSdcardFolder?.id;

  const selectedTargetExists = !!targets?.find(
    (target) => target.id === selectedTarget
  );

  useLayoutEffect(() => {
    if (logBoxRef?.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  }, [logs]);

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
          value={selectedTarget}
          onChange={(e) => setSelectedTarget(e.target.value as string)}
        >
          {targets?.map((radio) => (
            <MenuItem key={radio.name} value={radio.name}>
              {radio.name}
            </MenuItem>
          ))}
        </Select>
        {sdcardTargetsQuery.error && (
          <FormHelperText>Could not load targets</FormHelperText>
        )}
      </FormControl>
      <Button onClick={() => pickFolder()}>Select directory</Button>
      <Button disabled={!selectedTargetExists} onClick={async () => {}}>
        Make SD
      </Button>
      <Box
        ref={logBoxRef}
        flexGrow={1}
        overflow="scroll"
        sx={{ overflowX: "hidden" }}
      >
        {logs.map((line) => (
          <Typography>{line}</Typography>
        ))}
      </Box>
    </Box>
  );
};

export default SdcardWizard;
