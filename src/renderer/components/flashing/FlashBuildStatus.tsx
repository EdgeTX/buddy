import { InfoCircleOutlined } from "@ant-design/icons";
import React, { useEffect, useState } from "react";
import { JobStatus } from "shared/backend";
import type { FlashingBuildStageStatus } from "./FlashJobTimeline";

function formatDuration(time: number): string {
  const sec = time % 60;
  const mn = Math.floor(time / 60);
  const formattedSec = String(sec).padStart(2, "0");
  const formattedMn = String(mn).padStart(2, "0");
  if (mn < 1) return `00:${formattedSec}`;
  return `${formattedMn}:${formattedSec}`;
}

function jobStatusText(status: JobStatus): string {
  return {
    VOID: "Created",
    WAITING_FOR_BUILD: "In queue",
    BUILD_IN_PROGRESS: "Building on server",
    BUILD_SUCCESS: "Build finished",
    BUILD_ERROR: "Failed",
  }[status];
}

type Props = {
  status: FlashingBuildStageStatus;
};

const FlashBuildStatus: React.FC<Props> = ({ status }) => {
  const [sinceTime, setSinceTime] = useState(0);

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
        {jobStatusText(status.jobStatus as JobStatus)} since{"  "}
        {formatDuration(sinceTime)}
      </p>
    </div>
  );
};

export default FlashBuildStatus;
