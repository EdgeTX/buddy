import { InfoCircleOutlined } from "@ant-design/icons";
import React, { useEffect, useState } from "react";
import { JobStatus } from "shared/backend/types";
import { TFunction, useTranslation } from "react-i18next";
import type { FlashingBuildStageStatus } from "./FlashJobTimeline";

const pad2 = (n: number): string => n.toString().padStart(2, "0");

/** Formats an elapsed duration in seconds as mm:ss (minutes keep counting past 59). */
export const formatElapsed = (seconds: number): string => {
  const total = Math.max(0, Math.floor(seconds));
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
};

function jobStatusText(
  status: JobStatus,
  t: TFunction<"flashing", undefined>
): string {
  return {
    VOID: t("Created"),
    WAITING_FOR_BUILD: t("In queue"),
    BUILD_IN_PROGRESS: t("Building on server"),
    BUILD_SUCCESS: t("Build finished"),
    BUILD_ERROR: t("Failed"),
  }[status];
}

type Props = {
  status: FlashingBuildStageStatus;
};

const FlashBuildStatus: React.FC<Props> = ({ status }) => {
  const [sinceTime, setSinceTime] = useState(0);
  const { t } = useTranslation("flashing");

  useEffect(() => {
    const interval = setInterval(() => {
      setSinceTime(
        Math.round((new Date().getTime() - Number(status.startedAt)) / 1000)
      );
    }, 500);
    return () => clearInterval(interval);
  }, [status]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        marginTop: 8,
        marginLeft: 12,
        gap: 8,
      }}
    >
      <InfoCircleOutlined
        style={{ transform: "translate(0, 2px)", color: "gray" }}
      />{" "}
      <p style={{ color: "gray", border: "black" }}>
        {jobStatusText(status.jobStatus as JobStatus, t)} -{"  "}
        {formatElapsed(sinceTime)}
      </p>
    </div>
  );
};

export default FlashBuildStatus;
