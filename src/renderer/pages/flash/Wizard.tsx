import Grid from "@mui/material/Grid";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import IconArrowRight from "@mui/icons-material/ArrowRight";
import IconArrowLeft from "@mui/icons-material/ArrowLeft";
import { gql, useMutation } from "@apollo/client";
import useQueryParams from "renderer/hooks/useQueryParams";
import SelectFirmware from "./steps/SelectFirmware";
import ConnectionOptions from "./steps/ConnectionOptions";

const stages = ["firmware", "connection"] as const;
type Stage = typeof stages[number];

const FlashingWizard: React.FC = () => {
  const [stage, setStage] = useState<Stage>(stages[0]);
  const { parseParam, updateParams } = useQueryParams([
    "version",
    "target",
    "deviceId",
  ]);
  const navigate = useNavigate();

  const [registerFirmware] = useMutation(
    gql(/* GraphQL */ `
      mutation RegisterLocalFirmware($data: String!) {
        registerLocalFirmware(firmwareBase64Data: $data) {
          id
        }
      }
    `)
  );

  const [createFlashJob] = useMutation(
    gql(/* GraphQL */ `
      mutation CreateFlashJob($firmware: FlashFirmwareInput!, $deviceId: ID!) {
        createFlashJob(firmware: $firmware, deviceId: $deviceId) {
          id
        }
      }
    `)
  );

  const version = parseParam("version");
  const target = parseParam("target");
  const deviceId = parseParam("deviceId");

  useEffect(() => {
    if (!version || !target) {
      setStage("firmware");
    } else {
      setStage("connection");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box sx={{ height: "500px" }}>
      <Box sx={{ height: "100%" }}>
        {stage === "firmware" && (
          <SelectFirmware
            onFirmwareProvided={async (firmwareData) => {
              const registerFirmwareResponse = await registerFirmware({
                variables: { data: firmwareData.toString("base64") },
              });
              if (registerFirmwareResponse.data) {
                updateParams({
                  version: "local",
                  target:
                    registerFirmwareResponse.data.registerLocalFirmware.id,
                });
              }
            }}
            onTargetSelected={(newTarget) =>
              updateParams({ target: newTarget })
            }
            onVersionSelected={(newVersion) =>
              updateParams({ version: newVersion })
            }
            onIncludePrereleases={() => {}}
            version={version ?? undefined}
            target={target ?? undefined}
          />
        )}
        {stage === "connection" && (
          <ConnectionOptions
            onDeviceSelected={(newDeviceId) =>
              updateParams({ deviceId: newDeviceId })
            }
            deviceId={deviceId}
          />
        )}
      </Box>
      <Grid container direction="row" justifyContent="flex-end" height="30px">
        <Box>
          <Button
            sx={{
              visibility: stages.indexOf(stage) === 0 ? "hidden" : undefined,
            }}
            startIcon={<IconArrowLeft />}
            onClick={() => {
              const previousStage = stages[stages.indexOf(stage) - 1];
              if (previousStage) {
                setStage(previousStage);
              }
            }}
          >
            Back
          </Button>
          <Button
            endIcon={stage !== "connection" && <IconArrowRight />}
            onClick={() => {
              if (stage === "firmware" && (!version || !target)) {
                return;
              }
              if (stage === "connection" && deviceId && target && version) {
                createFlashJob({
                  variables: { firmware: { target, version }, deviceId },
                })
                  .then((jobCreateResult) => {
                    if (jobCreateResult.data) {
                      navigate(
                        `/flash/${jobCreateResult.data.createFlashJob.id}`
                      );
                    } else {
                      console.error("Error", jobCreateResult.errors);
                    }
                  })
                  .catch((e) => {
                    console.error("Error", e);
                  });
              }
              setStage("connection");
            }}
          >
            {stage === "connection" ? "Start" : "Next"}
          </Button>
        </Box>
      </Grid>
    </Box>
  );
};

export default FlashingWizard;
