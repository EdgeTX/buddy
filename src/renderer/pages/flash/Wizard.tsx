import Grid from "@mui/material/Grid";
import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import ConnectionOptions from "./steps/ConnectionOptions";
import SelectFirmware from "./steps/SelectFirmware";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import IconArrowRight from "@mui/icons-material/ArrowRight";
import IconArrowLeft from "@mui/icons-material/ArrowLeft";
import ArrowCircleUp from "@mui/icons-material/ArrowCircleUp";
import { gql, useMutation } from "@apollo/client";

type Param = "version" | "target" | "deviceId" | "unprotectedFlash";

const extractParam = <
  T extends typeof String | typeof Boolean | typeof Number = typeof String
>(
  params: URLSearchParams,
  key: Param,
  type?: T
): ReturnType<T> | undefined => {
  const value = params.get(key);

  if (type === Number) {
    const parsedValue = Number(value);
    if (!Number.isNaN(parsedValue)) {
      return parsedValue as ReturnType<T> | undefined;
    }
  }

  if (type === Boolean && value !== null) {
    return (value === "true") as ReturnType<T> | undefined;
  }

  if (value !== null) {
    return value as ReturnType<T> | undefined;
  }

  return undefined;
};

const stages = ["firmware", "connection"] as const;
type Stage = typeof stages[number];

const FlashingWizard: React.FC = () => {
  const [stage, setStage] = useState<Stage>(stages[0]);
  const [params, setParams] = useSearchParams();
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

  const version = extractParam(params, "version");
  const target = extractParam(params, "target");
  const deviceId = extractParam(params, "deviceId");
  const unprotectedFlashing = extractParam(params, "unprotectedFlash", Boolean);

  const updateParams = (params: Record<string, string | undefined>) => {
    const newObject = {
      version,
      target,
      deviceId,
      unprotectedFlashing,
      ...params,
    };
    setParams(
      Object.fromEntries(
        Object.entries(newObject).filter(
          ([, value]) => value !== null && value !== undefined
        ) as [string, string][]
      ),
      { replace: true }
    );
  };

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
            onSetForceUnprotectedFlashing={(newForceUnprotected) =>
              updateParams({ unprotectedFlash: newForceUnprotected.toString() })
            }
            deviceId={deviceId}
            unprotectedFlashing={unprotectedFlashing}
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
                setStage(previousStage as Stage);
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
              } else if (
                stage === "connection" &&
                deviceId &&
                target &&
                version
              ) {
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
