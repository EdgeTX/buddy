import Grid from "@mui/material/Grid";
import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ConnectionOptions from "./steps/ConnectionOptions";
import SelectFirmware from "./steps/SelectFirmware";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import IconArrowRight from "@mui/icons-material/ArrowRight";
import IconArrowLeft from "@mui/icons-material/ArrowLeft";
import FlashingStatus from "./steps/FlashingStatus";
import { useFlasher } from "../../flashing/flash";
import CompletePage from "./steps/Complete";
import ArrowCircleUp from "@mui/icons-material/ArrowCircleUp";

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

const stages = ["firmware", "connection", "flash", "complete"] as const;
type Stage = typeof stages[number];

const FlashingWizard: React.FC = () => {
  const [stage, setStage] = useState<Stage>(stages[0]);
  const [params, setParams] = useSearchParams();
  const { flash, state: flashState, cancel, loadFirmware } = useFlasher();

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
              const firmwareHash = await loadFirmware(firmwareData);
              updateParams({ target: "local", version: firmwareHash });
            }}
            onTargetSelected={(newTarget) =>
              updateParams({ target: newTarget })
            }
            onVersionSelected={(newVersion) =>
              updateParams({ version: newVersion })
            }
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
        {stage === "flash" && flashState && (
          <FlashingStatus state={flashState} />
        )}
        {stage === "complete" && <CompletePage />}
      </Box>
      <Grid container direction="row" justifyContent="flex-end" height="30px">
        {stage !== "complete" && (
          <Box>
            <Button
              sx={{
                visibility: stages.indexOf(stage) === 0 ? "hidden" : undefined,
              }}
              startIcon={stage !== "flash" && <IconArrowLeft />}
              onClick={() => {
                const previousStage = stages[stages.indexOf(stage) - 1];
                if (previousStage) {
                  if (previousStage === "connection") {
                    cancel().then(() => {
                      setStage("firmware");
                    });
                  }
                  setStage(previousStage as Stage);
                }
              }}
            >
              {stage === "flash" ? "Cancel" : "Back"}
            </Button>
            {stage !== "flash" && (
              <Button
                endIcon={stage !== "connection" && <IconArrowRight />}
                disabled={stages.indexOf(stage) === stages.length - 1}
                onClick={() => {
                  if (stage === "firmware" && (!version || !target)) {
                    return;
                  }

                  const nextStage = stages[stages.indexOf(stage) + 1];

                  if (nextStage === "flash" && deviceId && target && version) {
                    flash(target, version, deviceId)
                      .then((completed) => {
                        if (completed) {
                          setStage((currentStage) => {
                            if (currentStage === "flash") {
                              return stages[stages.indexOf(currentStage) + 1];
                            }
                            return currentStage;
                          });
                        }
                      })
                      .catch((e) => {
                        console.error("Error", e);
                      });
                  }
                  setStage(nextStage);
                }}
              >
                {stage === "connection" ? "Start" : "Next"}
              </Button>
            )}
          </Box>
        )}
        {stage === "complete" && (
          <Button
            endIcon={<ArrowCircleUp />}
            onClick={() => {
              setStage(stages[0]);
            }}
          >
            Start again
          </Button>
        )}
      </Grid>
    </Box>
  );
};

export default FlashingWizard;
