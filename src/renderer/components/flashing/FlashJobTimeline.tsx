import {
  CloudDownloadOutlined,
  CloudSyncOutlined,
  DeleteOutlined,
  DoubleRightOutlined,
  LoadingOutlined,
  RocketOutlined,
  UsbOutlined,
} from "@ant-design/icons";
import { Alert, Button, Progress, Steps, Typography } from "antd";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";

type FlashingStageStatus = {
  progress: number;
  started: boolean;
  completed: boolean;
  error?: string | null;
};

type FlashingState = {
  connect: FlashingStageStatus;
  build?: FlashingStageStatus | null;
  download?: FlashingStageStatus | null;
  erase: FlashingStageStatus;
  flash: FlashingStageStatus;
};

type Props = {
  state: FlashingState;
};

type StageConfig = {
  titles: {
    pre: string;
    active: string;
    post: string;
  };
  stage: keyof FlashingState;
  description: {
    pre: string;
    active: string;
    post: string;
    error: string;
  };
  showProgess?: boolean;
  Icon: React.FC;
};

/**
 * TODO: Align titles with the ant step types: wait, process, finish, error
 */
const useStateConfigs = (): StageConfig[] => {
  const { t, i18n } = useTranslation("flashing");

  return useMemo(
    () => [
      {
        titles: {
          pre: t(`Connect`),
          active: t(`Connecting`),
          post: t(`Connected`),
        },
        stage: "connect",
        description: {
          pre: t(`Connect to DFU interface`),
          active: t(`Connecting to DFU interface and verifying configuration`),
          post: t(`DFU connection active`),
          error: t(`Could not connect to DFU interface`),
        },
        Icon: UsbOutlined,
      },
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
          active: t(`Downloading firmware data to be ready for flashing`),
          post: t(`Firmware downloaded, ready to flash`),
          error: t(`Could not download firmware`),
        },
        Icon: CloudDownloadOutlined,
      },
      {
        titles: { pre: t(`Erase`), active: t(`Erasing`), post: t(`Erased`) },
        stage: "erase",
        description: {
          pre: t(`Remove existing firmware`),
          active: t(`Removing existing firmware from radio`),
          post: t(`Existing firmware erased`),
          error: t(`Could not erase existing firmware`),
        },
        Icon: DeleteOutlined,
        showProgess: true,
      },
      {
        titles: { pre: t(`Flash`), active: t(`Flashing`), post: t(`Flashed`) },
        stage: "flash",
        description: {
          pre: t(`Write new firmware`),
          active: t(
            `Writing new firmware to radio, this could take several minutes`
          ),
          post: t(`New firmware flashed`),
          error: t(`Could not write new firmware to radio`),
        },
        Icon: DoubleRightOutlined,
        showProgess: true,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, i18n.language]
  );
};

const stageTitle = (
  config: StageConfig,
  stage: FlashingStageStatus
): string => {
  if (!stage.started) {
    return config.titles.pre;
  }

  if (!stage.completed) {
    return config.titles.active;
  }

  return config.titles.post;
};

const stageIcon = (
  config: StageConfig,
  stage: FlashingStageStatus
): React.ReactNode => {
  if (stage.error) {
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
  stage: FlashingStageStatus
): "wait" | "process" | "error" | "finish" => {
  if (stage.completed) {
    return "finish";
  }

  if (stage.error) {
    return "error";
  }

  if (stage.started) {
    return "process";
  }

  return "wait";
};

const stageDescription = (
  config: StageConfig,
  stage: FlashingStageStatus
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
  stageStatus: FlashingStageStatus
): "danger" | "secondary" | undefined => {
  if (stageStatus.error) {
    return "danger";
  }

  if (!stageStatus.started || stageStatus.completed) {
    return "secondary";
  }

  return undefined;
};

const stepBaseStyle = {
  flex: 1,
  overflow: "hidden",
  transition: "max-height 0.25s ease-out",
};

const FlashJobTimeline: React.FC<Props> = ({ state }) => {
  const { t } = useTranslation("flashing");
  const stageConfigs = useStateConfigs();

  const lastStepCompleted =
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    state[stageConfigs[stageConfigs.length - 1]!.stage]!.completed;
  const minStepHeight = !lastStepCompleted ? 80 : 60;

  return (
    <Steps
      direction="vertical"
      current={stageConfigs.findIndex(
        (stage) => state[stage.stage] && !state[stage.stage]?.started
      )}
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
          const active = stageStatus?.started && !stageStatus.completed;
          return stageStatus ? (
            <Steps.Step
              style={{
                ...stepBaseStyle,
                paddingBottom: 16,
                maxHeight: active ? 300 : minStepHeight,
              }}
              key={config.stage}
              icon={stageIcon(config, stageStatus)}
              title={stageTitle(config, stageStatus)}
              status={status(stageStatus)}
              description={
                !lastStepCompleted ? (
                  <>
                    <Typography.Text type={descriptionTextColor(stageStatus)}>
                      {stageDescription(config, stageStatus)}
                    </Typography.Text>
                    {config.showProgess && (
                      <div
                        style={{
                          marginRight: 32,
                          marginTop: 32,
                        }}
                      >
                        <Progress
                          // Round to 2dp
                          percent={Math.round(stageStatus.progress * 100) / 100}
                          status={stageStatus.error ? "exception" : "active"}
                        />
                      </div>
                    )}
                    {stageStatus.error && (
                      <Alert
                        style={{ marginTop: 16 }}
                        message={t(`Error`)}
                        description={stageStatus.error}
                        type="error"
                        action={
                          <Button disabled size="small" danger>
                            {t(`Details`)}
                          </Button>
                        }
                      />
                    )}
                  </>
                ) : null
              }
            />
          ) : null;
        })
      }
      <Steps.Step
        status={lastStepCompleted ? "finish" : "wait"}
        title={t(`Flashing done`)}
        icon={lastStepCompleted ? undefined : <RocketOutlined />}
        style={{
          ...stepBaseStyle,
          maxHeight: 35,
        }}
      />
    </Steps>
  );
};

export default FlashJobTimeline;
