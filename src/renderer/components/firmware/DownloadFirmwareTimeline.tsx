import {
  CloudDownloadOutlined,
  CloudSyncOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { Alert, Button, Steps, Typography } from "antd";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import FlashBuildStatus from "renderer/components/flashing/FlashBuildStatus";

export type BuildStatus = {
  jobStatus: string;
  startedAt: string;
};

export type BuildDownloadStageStatus = {
  started: boolean;
  completed: boolean;
  error?: string | null;
  status?: BuildStatus | null;
};

export type BuildDownloadState = {
  build: BuildDownloadStageStatus;
  download: BuildDownloadStageStatus;
};

type Props = {
  state: BuildDownloadState;
};

type StageConfig = {
  titles: {
    pre: string;
    active: string;
    post: string;
  };
  stage: keyof BuildDownloadState;
  description: {
    pre: string;
    active: string;
    post: string;
    error: string;
  };
  Icon: React.FC;
};

const useStageConfigs = (): StageConfig[] => {
  const { t, i18n } = useTranslation("flashing");

  return useMemo(
    () => [
      {
        titles: { pre: t(`Build`), active: t(`Building`), post: t(`Built`) },
        stage: "build",
        description: {
          pre: t(`Start firmware build`),
          active: t(`Building firmware with specified configurations`),
          post: t(`Firmware build completed`),
          error: t(`Could not build firmware`),
        },
        Icon: CloudSyncOutlined,
      },
      {
        titles: {
          pre: t(`Download`),
          active: t(`Downloading`),
          post: t(`Downloaded`),
        },
        stage: "download",
        description: {
          pre: t(`Download firmware data`),
          active: t(`Downloading firmware`),
          post: t(`Firmware downloaded`),
          error: t(`Could not download firmware`),
        },
        Icon: CloudDownloadOutlined,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, i18n.language]
  );
};

const stageTitle = (
  config: StageConfig,
  stage: BuildDownloadStageStatus
): string => {
  if (!stage.started) {
    return config.titles.pre;
  }

  if (!stage.completed) {
    return config.titles.active;
  }

  return config.titles.post;
};

const isError = (stage: BuildDownloadStageStatus): boolean =>
  !!stage.error || stage.status?.jobStatus === "BUILD_ERROR";

const stageIcon = (
  config: StageConfig,
  stage: BuildDownloadStageStatus
): React.ReactNode => {
  if (isError(stage)) {
    return undefined;
  }
  if (stage.completed) {
    return undefined;
  }

  if (stage.started) {
    return <LoadingOutlined />;
  }

  return <config.Icon />;
};

const status = (
  stage: BuildDownloadStageStatus
): "wait" | "process" | "error" | "finish" => {
  if (stage.completed) {
    return "finish";
  }

  if (isError(stage)) {
    return "error";
  }

  if (stage.started) {
    return "process";
  }

  return "wait";
};

const stageDescription = (
  config: StageConfig,
  stage: BuildDownloadStageStatus
): string => {
  const currentStatus = status(stage);
  switch (currentStatus) {
    case "error":
      return config.description.error;
    case "finish":
      return config.description.post;
    case "wait":
      return config.description.pre;
    case "process":
      return config.description.active;
  }

  return "";
};

const descriptionTextColor = (
  stage: BuildDownloadStageStatus
): "danger" | "secondary" | undefined => {
  if (isError(stage)) {
    return "danger";
  }

  if (!stage.started || stage.completed) {
    return "secondary";
  }

  return undefined;
};

const stepBaseStyle = {
  flex: 1,
  overflow: "hidden",
  transition: "max-height 0.25s ease-out",
};

export const DownloadFirmwareTimeline: React.FC<Props> = ({ state }) => {
  const { t } = useTranslation("flashing");
  const stageConfigs = useStageConfigs();

  const lastStepCompleted =
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    state[stageConfigs[stageConfigs.length - 1]!.stage]!.completed;
  const minStepHeight = !lastStepCompleted ? 80 : 60;
  return (
    <Steps
      direction="vertical"
      current={stageConfigs.findIndex((stage) => !state[stage.stage].started)}
      style={{
        height: "100%",
        transition: "max-height 0.25s ease-out",
        maxHeight: lastStepCompleted ? "275px" : "600px",
      }}
    >
      {
        // Annoying that we can't make this it's own component. Something to do with
        // Internals of how ant makes these steps
        stageConfigs.map((config) => {
          const stageStatus = state[config.stage];
          const error = isError(stageStatus);
          const active = stageStatus.started && !stageStatus.completed;
          return (
            <Steps.Step
              style={{
                ...stepBaseStyle,
                paddingBottom: 16,
                maxHeight: active ? 200 : minStepHeight,
              }}
              key={config.stage}
              icon={stageIcon(config, stageStatus)}
              title={stageTitle(config, stageStatus)}
              status={status(stageStatus)}
              description={
                !lastStepCompleted ? (
                  <div
                    style={
                      // Ensure that the progress bar inside the content
                      // doesn't show if step is not active
                      {
                        transition: "max-height 0.25s ease-out",
                        maxHeight: !active ? "35px" : "600px",
                        overflow: "hidden",
                      }
                    }
                  >
                    <Typography.Text type={descriptionTextColor(stageStatus)}>
                      {stageDescription(config, stageStatus)}
                    </Typography.Text>
                    {!error && stageStatus.status && (
                      <FlashBuildStatus status={stageStatus.status} />
                    )}
                    {error && (
                      <Alert
                        style={{ marginTop: 16, marginRight: 16 }}
                        message={t(`Error`)}
                        description={stageStatus.error ?? "Build failed"}
                        type="error"
                        action={
                          <Button disabled size="small" danger>
                            {t(`Details`)}
                          </Button>
                        }
                      />
                    )}
                  </div>
                ) : null
              }
            />
          );
        })
      }
    </Steps>
  );
};

// export default DownloadFirmwareTimeline;
