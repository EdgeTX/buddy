import {
  CloudDownloadOutlined,
  CloudSyncOutlined,
  DeleteOutlined,
  DoubleRightOutlined,
  LoadingOutlined,
  RocketOutlined,
  UnlockOutlined,
  UsbOutlined,
} from "@ant-design/icons";
import { Alert, Button, Progress, Steps, Typography } from "antd";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import FlashBuildStatus from "./FlashBuildStatus";

export type FlashingBuildStageStatus = {
  jobStatus: string;
  startedAt: string;
};

type FlashingStageStatus = {
  progress: number;
  started: boolean;
  completed: boolean;
  error?: string | null;
  status?: FlashingBuildStageStatus | null;
};

type FlashingState = {
  connect: FlashingStageStatus;
  build?: FlashingStageStatus | null;
  download?: FlashingStageStatus | null;
  eraseBL?: FlashingStageStatus | null;
  flashBL?: FlashingStageStatus | null;
  reboot?: FlashingStageStatus | null;
  erase: FlashingStageStatus;
  flash: FlashingStageStatus;
};

type Props = {
  state: FlashingState;
  hideSpecialOptions?: boolean;
  onSpecialErrorActionClicked?: () => void;
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
  showProgress?: boolean;
  Icon: React.FC;
};

/**
 * TODO: Align titles with the ant step types: wait, process, finish, error
 */
const useStageConfigs = (): StageConfig[] => {
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
        titles: {
          pre: t(`Erase bootloader`),
          active: t(`Erasing bootloader`),
          post: t(`Bootloader erased`),
        },
        stage: "eraseBL",
        description: {
          pre: t(`Remove existing bootloader`),
          active: t(`Removing existing bootloader from radio`),
          post: t(`Existing bootloader erased`),
          error: t(`Could not erase existing bootloader`),
        },
        Icon: DeleteOutlined,
        showProgress: true,
      },
      {
        titles: {
          pre: t(`Flash bootloader`),
          active: t(`Flashing bootloader`),
          post: t(`Bootloader flashed`),
        },
        stage: "flashBL",
        description: {
          pre: t(`Write new bootloader`),
          active: t(`Writing new bootloader to radio`),
          post: t(`New bootloader flashed`),
          error: t(`Could not write new bootloader to radio`),
        },
        Icon: DoubleRightOutlined,
        showProgress: true,
      },
      {
        titles: {
          pre: t(`Reboot`),
          active: t(`Rebooting`),
          post: t(`Rebooted`),
        },
        stage: "reboot",
        description: {
          pre: t(`Reboot into bootloader`),
          active: t(`Rebooting into bootloader`),
          post: t(`Rebooted into bootloader`),
          error: t(`Could not reboot into bootloader`),
        },
        Icon: DoubleRightOutlined,
        showProgress: true,
      },
      {
        titles: {
          pre: t(`Erase firmware`),
          active: t(`Erasing firmware`),
          post: t(`Firmware erased`),
        },
        stage: "erase",
        description: {
          pre: t(`Remove existing firmware`),
          active: t(`Removing existing firmware from radio`),
          post: t(`Existing firmware erased`),
          error: t(`Could not erase existing firmware`),
        },
        Icon: DeleteOutlined,
        showProgress: true,
      },
      {
        titles: {
          pre: t(`Flash firmware`),
          active: t(`Flashing firmware`),
          post: t(`Firmware flashed`),
        },
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
        showProgress: true,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, i18n.language]
  );
};

const useSpecialErrors = (): Record<
  string,
  { message: string; action: string }
> => {
  const { t, i18n } = useTranslation("flashing");
  return useMemo(
    () => ({
      WRITE_PROTECTED: {
        message: t(`Device firmware may be read protected, preventing updates`),
        action: t(`Enable firmware updating`),
      },
    }),
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

const FlashJobTimeline: React.FC<Props> = ({
  state,
  hideSpecialOptions,
  onSpecialErrorActionClicked,
}) => {
  const { t } = useTranslation("flashing");
  const stageConfigs = useStageConfigs();
  const specialErrors = useSpecialErrors();

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
          const isSpecialError =
            stageStatus?.error && specialErrors[stageStatus.error];
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
                    {!stageStatus.error && stageStatus.status && (
                      <FlashBuildStatus status={stageStatus.status} />
                    )}
                    {config.showProgress && !isSpecialError && (
                      <div
                        style={{
                          marginRight: 32,
                          marginTop: 8,
                        }}
                      >
                        <Progress
                          // Round to 2dp
                          percent={Math.round(stageStatus.progress * 100) / 100}
                          status={stageStatus.error ? "exception" : "active"}
                        />
                      </div>
                    )}
                    {stageStatus.error &&
                      (isSpecialError ? (
                        <Alert
                          style={{ marginTop: 16, marginRight: 16 }}
                          message={specialErrors[stageStatus.error]?.message}
                          type="error"
                          description={
                            !hideSpecialOptions && (
                              <Button
                                type="primary"
                                icon={<UnlockOutlined />}
                                style={{ marginTop: 8 }}
                                onClick={onSpecialErrorActionClicked}
                              >
                                {specialErrors[stageStatus.error]?.action}
                              </Button>
                            )
                          }
                        />
                      ) : (
                        <Alert
                          style={{ marginTop: 16, marginRight: 16 }}
                          message={t(`Error`)}
                          description={stageStatus.error}
                          type="error"
                          action={
                            <Button disabled size="small" danger>
                              {t(`Details`)}
                            </Button>
                          }
                        />
                      ))}
                  </div>
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
