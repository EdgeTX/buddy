import ky from "ky";
import { Button, Modal, message } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { ButtonSize, ButtonType } from "antd/lib/button";
import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import legacyDownload from "js-file-download";
import isUF2Payload from "shared/uf2/uf2";
import useCloudFirmware from "renderer/hooks/useCloudFirmware";
import { SelectedFlags } from "shared/backend/types";
import { SelectedFlag } from "renderer/__generated__/tag/graphql";
import {
  BuildDownloadState,
  DownloadFirmwareTimeline,
} from "./DownloadFirmwareTimeline";

type Props = {
  target?: string;
  version?: string;
  selectedFlags?: SelectedFlags;
  children?: string;
  type?: ButtonType;
  size?: ButtonSize;
  disabled: boolean;
  state?: BuildDownloadState;
};

type Timeout = ReturnType<typeof setInterval>;

const defaultDownloadState: BuildDownloadState = {
  build: {
    started: false,
    completed: false,
  },
  download: {
    started: false,
    completed: false,
  },
};

const DownloadCloudbuildButton: React.FC<Props> = ({
  state,
  target,
  version,
  selectedFlags,
  children,
  type,
  size,
  disabled,
}) => {
  const [open, setOpen] = React.useState<boolean>(false);
  const [downloadState, setDownloadState] = useState(
    state ?? defaultDownloadState
  );
  const intervalRef = useRef<Timeout>();
  const { t } = useTranslation("flashing");
  const btnContent = children ?? t(`Download firmware`);

  const createCloudFirmware = useCloudFirmware();
  const flags = (selectedFlags ?? []) as SelectedFlag[];
  const fwParams = {
    params: {
      release: version ?? "",
      target: target ?? "",
      flags,
    },
  };

  const getStatus = (start: boolean): void => {
    if (start) {
      // mark the build as started
      setDownloadState((prevState) => ({
        ...prevState,
        build: {
          ...prevState.build,
          started: true,
        },
      }));
    }
    createCloudFirmware(fwParams)
      .then((buildStatus) => {
        const { status, downloadUrl } = buildStatus;
        const jobStatus = status;
        const completed = !!downloadUrl;

        setDownloadState((prevState) => {
          let startedAt;
          if (!prevState.build.status) {
            startedAt = new Date().getTime().toString();
          } else {
            startedAt = prevState.build.status.startedAt;
          }
          const newState = {
            ...prevState,
            build: {
              started: true,
              status: {
                jobStatus,
                startedAt,
              },
              completed,
            },
          };
          return newState;
        });

        if (completed) {
          stopPolling();
          startFirmwareDownload(downloadUrl).catch((err) => {
            console.log(err);
          });
        }
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const download = async (downloadUrl: string): Promise<void> => {
    const response = await ky(downloadUrl, {
      headers: {
        origin: "null",
      },
    });
    const fileData = await response.arrayBuffer();
    const flagValues =
      flags.length > 0 ? `-${flags.map((flag) => flag.value).join("-")}` : "";
    const ext = isUF2Payload(fileData) ? "uf2" : "bin";
    legacyDownload(
      fileData,
      `${version ?? ""}-${target ?? ""}${flagValues}.${ext}`,
      "application/octet-stream"
    );
  };

  const startFirmwareDownload = async (downloadUrl: string): Promise<void> => {
    setDownloadState((prevState) => {
      const newState = {
        ...prevState,
        download: {
          ...prevState.download,
          started: true,
        },
      };
      return newState;
    });
    await download(downloadUrl)
      .then(() => {
        setDownloadState((prevState) => ({
          ...prevState,
          download: {
            ...prevState.download,
            completed: true,
          },
        }));
        closeDialog();
        void message.success(t(`Firmware file saved`));
      })
      .catch((e: Error) => {
        if (e.name !== "AbortError") {
          void message.error(
            t(`Could not download firmware: {{message}}`, {
              message: e.message,
            })
          );
        }
      });
  };

  const startPolling = (): void => {
    intervalRef.current = setInterval(() => {
      getStatus(false);
    }, 1000);
  };

  const stopPolling = (): void => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
  };

  const openDialog = (): void => {
    setOpen(true);
    getStatus(true);
    startPolling();
  };

  const closeDialog = (): void => {
    setOpen(false);
    stopPolling();
    const initialState = state ?? defaultDownloadState;
    setDownloadState({ ...initialState });
  };

  return (
    <>
      <Button
        type={type}
        icon={<DownloadOutlined />}
        disabled={disabled}
        size={size}
        onClick={openDialog}
      >
        {btnContent}
      </Button>
      <Modal
        title={t(`Cloudbuild download`)}
        footer={
          <Button type="primary" onClick={closeDialog}>
            {t(`Cancel`)}
          </Button>
        }
        closable={false}
        visible={open}
        onCancel={closeDialog}
      >
        <DownloadFirmwareTimeline state={downloadState} />
      </Modal>
    </>
  );
};

export default DownloadCloudbuildButton;
