import { gql, useQuery } from "@apollo/client";
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
import githubClient from "../../gql/github";

const radios = [
  { name: "FlySky Nirvana", target: "nv14.zip" },
  { name: "Jumper T16", target: "horus.zip" },
  { name: "Jumper T18", target: "horus.zip" },
  { name: "Jumper T-Lite", target: "taranis-x7.zip" },
  { name: "Jumper T12", target: "taranis-x7.zip" },
  { name: "Jumper T8", target: "taranis-x7.zip" },
  { name: "FrSky Horus X10", target: "horus.zip" },
  { name: "FrSky Horus X12s", target: "horus.zip" },
  { name: "FrSky QX7", target: "taranis-x7.zip" },
  { name: "FrSky X9D", target: "taranis-x9.zip" },
  { name: "FrSky X9D Plus", target: "taranis-x9.zip" },
  { name: "FrSky X9D Plus 2019", target: "taranis-x9.zip" },
  { name: "FrSky X-Lite", target: "taranis-x7.zip" },
  { name: "FrSky X9 Lite", target: "taranis-x7.zip" },
  { name: "Radiomaster TX12", target: "taranis-x7.zip" },
  { name: "Radiomaster TX16s", target: "horus.zip" },
];

const SdcardWizard: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedRadio, setSelectedRadio] = useState<string>();
  const logBoxRef = useRef<HTMLElement | null>(null);
  const log = (line: string) =>
    setLogs((existingLogs) => existingLogs.concat([line]));

  const { data, error, loading } = useQuery(
    gql(/* GraphQL */ `
      query SDCardReleaseAssets {
        repository(owner: "EdgeTX", name: "edgetx-sdcard") {
          id
          release(tagName: "latest") {
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
    { client: githubClient }
  );

  const sdCardAssets =
    data?.repository?.release?.releaseAssets.nodes?.filter(
      isNotNullOrUndefined
    ) ?? [];

  const radiosWithTargetUrls = sdCardAssets.flatMap((asset) =>
    radios
      .filter((radio) => radio.target === asset.name)
      .map((radio) => ({ ...radio, url: asset.url }))
  );
  const selectedTargetUrl = radiosWithTargetUrls.find(
    (radio) => radio.name === selectedRadio
  )?.url;

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
        error={!!error}
        disabled={loading || !!error}
      >
        <InputLabel id="select-radio-label">Select radio</InputLabel>
        <Select
          labelId="select-radio-label"
          id="select-radio"
          label="Select radio"
          value={selectedRadio}
          onChange={(e) => setSelectedRadio(e.target.value as string)}
        >
          {radiosWithTargetUrls?.map((radio) => (
            <MenuItem key={radio.name} value={radio.name}>
              {radio.name}
            </MenuItem>
          ))}
        </Select>
        {error && <FormHelperText>Could not load targets</FormHelperText>}
      </FormControl>
      <Button
        disabled={!selectedTargetUrl}
        onClick={async () => {
          if (!selectedTargetUrl) {
            return;
          }
          setLogs([]);
          log("Requesting directory");
          // TODO with node we will use native-file-system-adapter and pass the node adapter
          // specifying the directory which was picked using electron dialog
          const rootDirectory = await window.showDirectoryPicker({
            id: "edgetx-sdcard",
          });
          log("Downloading");
          const contents = await (
            await fetch(`http://localhost:8080/${selectedTargetUrl}`)
          ).blob();
          log("Reading file bundle");
          const { entries: zipEntries } = await unzipRaw(contents);

          log("Writing");
          const total = zipEntries.reduce(
            (acc, entity) => acc + entity.size,
            0
          );
          let progress = 0;
          await Promise.all(
            zipEntries.map(async (file) => {
              const path = file.name.split("/");
              const fileName = path[path.length - 1];
              // ensure the path exists
              // and recursively head down the tree
              // to get to the folder where this file needs
              // to go
              const fileDirectory = await path
                .slice(0, path.length - 1)
                .filter(Boolean)
                .reduce(
                  async (prev, directory) =>
                    prev.then(async (parentDirectory) =>
                      parentDirectory.getDirectoryHandle(directory, {
                        create: true,
                      })
                    ),
                  Promise.resolve(rootDirectory)
                );

              // Only need to save a file if there was something after the folder
              if (fileName.length > 0) {
                const fileHandle = await fileDirectory.getFileHandle(fileName, {
                  create: true,
                });
                await (await file.blob())
                  .stream()
                  .pipeTo(await fileHandle.createWritable());

                progress += file.size;
              }

              log(
                `[WRITING]: ${Math.round(
                  (progress / total) * 100
                )}% - ${path.join("/")}`
              );
            })
          );
          log("Completed");
        }}
      >
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
