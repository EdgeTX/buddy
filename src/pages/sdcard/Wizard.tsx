import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import React, { useLayoutEffect, useRef, useState } from "react";
import { unzipRaw } from "unzipit";

const SdcardWizard: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const logBoxRef = useRef<HTMLElement | null>(null);
  const log = (line: string) =>
    setLogs((existingLogs) => existingLogs.concat([line]));

  useLayoutEffect(() => {
    if (logBoxRef?.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <Box height="100%" sx={{ display: "flex", flexDirection: "column" }}>
      <Typography variant="h2">Sdcard wizard</Typography>
      <Button
        onClick={async () => {
          setLogs([]);
          log("Requesting directory");
          // TODO with node we will use native-file-system-adapter and pass the node adapter
          // specifying the directory which was picked using electron dialog
          const rootDirectory = await window.showDirectoryPicker({
            id: "edgetx-sdcard",
          });
          log("Downloading");
          const contents = await (await fetch("/nv14.zip")).blob();
          log("Reading file bundle");
          const { entries: zipEntries } = await unzipRaw(contents);

          log("Writing");
          const total = zipEntries.length;
          let progress = 0;
          await Promise.all(
            Array.from(zipEntries).map(async (file) => {
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
              if (fileName.length > 0) {
                // No file tosave, this was just a folder
                const fileHandle = await fileDirectory.getFileHandle(fileName, {
                  create: true,
                });
                await (await file.blob())
                  .stream()
                  .pipeTo(await fileHandle.createWritable());
              }
              log(
                `[WRITING]: ${Math.round(
                  (progress++ / total) * 100
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
