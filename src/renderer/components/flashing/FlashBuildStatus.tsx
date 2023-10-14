import { InfoCircleOutlined } from "@ant-design/icons";
import React, { useEffect, useState } from "react";
import { JobStatus } from "shared/backend/types";
import { format } from "date-fns";
import type { FlashingBuildStageStatus } from "./FlashJobTimeline";
import { TFunction, useTranslation } from "react-i18next";

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
        {format(sinceTime * 1000, "mm:ss")}
      </p>
    </div>
  );
};

export default FlashBuildStatus;
