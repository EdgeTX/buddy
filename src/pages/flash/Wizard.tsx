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

const stages = ["firmware", "connection", "flash"] as const;
type Stage = typeof stages[number];

const FlashingWizard: React.FC = () => {
  const [stage, setStage] = useState<Stage>(stages[0]);
  const [params, setParams] = useSearchParams();

  const version = extractParam(params, "version");
  const target = extractParam(params, "target");
  const deviceId = extractParam(params, "deviceId");
  const unprotectedFlashing = extractParam(params, "unprotectedFlash", Boolean);

  const setParam = <T extends string>(key: string, value: T | undefined) => {
    const newObject = {
      version,
      target,
      deviceId,
      unprotectedFlashing,
      [key]: value,
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
  }, []);

  return (
    <Box sx={{ height: "500px" }}>
      <Box sx={{ height: "100%" }}>
        {stage === "firmware" && (
          <SelectFirmware
            onTargetSelected={(newTarget) => setParam("target", newTarget)}
            onVersionSelected={(newVersion) => setParam("version", newVersion)}
            version={version ?? undefined}
            target={target ?? undefined}
          />
        )}
        {stage === "connection" && (
          <ConnectionOptions
            onDeviceSelected={(newDeviceId) =>
              setParam("deviceId", newDeviceId)
            }
            onSetForceUnprotectedFlashing={(newForceUnprotected) =>
              setParam("unprotectedFlash", newForceUnprotected.toString())
            }
            deviceId={deviceId}
            unprotectedFlashing={unprotectedFlashing}
          />
        )}
        {stage === "flash" && (
          <FlashingStatus
            connection={{
              connected: true,
              connecting: false,
            }}
            downloading={{
              started: true,
              completed: true,
              progress: 100,
            }}
            erasing={{
              started: true,
              completed: true,
              progress: 100,
            }}
            flashing={{
              started: true,
              completed: false,
              progress: 50,
            }}
          />
        )}
      </Box>
      <Grid
        container
        direction="row"
        justifyContent="space-between"
        height="30px"
      >
        <Button
          startIcon={<IconArrowLeft />}
          disabled={stages.indexOf(stage) === 0}
          onClick={() => {
            const previousStage = stages[stages.indexOf(stage) - 1];
            if (previousStage) {
              setStage(previousStage as Stage);
            }
          }}
        >
          {stage === "flash" ? "Cancel" : "Back"}
        </Button>
        <Button
          endIcon={<IconArrowRight />}
          disabled={stages.indexOf(stage) === stages.length - 1}
          onClick={() => {
            if (stage === "firmware" && (!version || !target)) {
              return;
            }
            setStage(stages[stages.indexOf(stage) + 1]);
          }}
        >
          {stage === "connection" ? "Start" : "Next"}
        </Button>
      </Grid>
    </Box>
  );
};

export default FlashingWizard;
