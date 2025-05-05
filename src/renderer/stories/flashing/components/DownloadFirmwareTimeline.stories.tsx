import React, { useEffect, useState } from "react";
import { DownloadFirmwareTimeline } from "renderer/components/firmware/DownloadFirmwareTimeline";

export default {
  title: "Flashing/components/DownloadFirmwareTimeline",
  component: DownloadFirmwareTimeline,
};

export const building: React.FC = () => (
  <DownloadFirmwareTimeline
    state={{
      build: {
        started: true,
        completed: false,
        status: {
          jobStatus: "WAITING_FOR_BUILD",
          startedAt: new Date().getTime().toString(),
        },
      },
      download: {
        started: false,
        completed: false,
      },
    }}
  />
);

export const buildError: React.FC = () => (
  <DownloadFirmwareTimeline
    state={{
      build: {
        started: true,
        status: {
          jobStatus: "BUILD_ERROR",
          startedAt: new Date().getTime().toString(),
        },
        error: "Build failed",
        completed: false,
      },
      download: {
        started: false,
        completed: false,
      },
    }}
  />
);

export const downloading: React.FC = () => (
  <DownloadFirmwareTimeline
    state={{
      build: {
        started: true,
        completed: true,
      },
      download: {
        started: true,
        completed: false,
      },
    }}
  />
);

export const downloadError: React.FC = () => (
  <DownloadFirmwareTimeline
    state={{
      build: {
        started: true,
        completed: true,
      },
      download: {
        started: true,
        error: "Some error :(",
        completed: false,
      },
    }}
  />
);

const useDownloadState = () => {
  const [state, setState] = useState({
    build: {
      started: true,
      completed: false,
      progress: 0,
    },
    download: {
      started: false,
      completed: false,
      progress: 0,
    },
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setState((existing) => {
        const currentStage = ["build", "download"].find(
          (key) => !existing[key as keyof typeof existing].completed
        ) as keyof typeof existing | undefined;

        if (!currentStage) {
          clearInterval(interval);
          return existing;
        }

        const stage = existing[currentStage];
        if (stage.started) {
          if (stage.progress < 100) {
            stage.progress += 10;
          } else {
            stage.completed = true;
          }
        } else {
          stage.started = true;
        }

        return {
          ...existing,
          [currentStage]: stage,
        };
      });
    }, 100);
  }, [setState]);

  return state;
};

export const fullProcess: React.FC = () => (
  // eslint-disable-next-line react-hooks/rules-of-hooks
  <DownloadFirmwareTimeline state={useDownloadState()} />
);
