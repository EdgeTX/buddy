import React, { useEffect, useState } from "react";
import FlashJobTimeline from "renderer/components/flashing/FlashJobTimeline";

export default {
  title: "Flashing/components/FlashJobTimeline",
  component: FlashJobTimeline,
};

export const connectingRelease: React.FC = () => (
  <FlashJobTimeline
    state={{
      connect: {
        started: true,
        progress: 0,
        completed: false,
      },
      download: {
        started: false,
        progress: 0,
        completed: false,
      },
      erase: {
        started: false,
        progress: 0,
        completed: false,
      },
      flash: {
        started: false,
        progress: 0,
        completed: false,
      },
    }}
  />
);

export const downloadingRelease: React.FC = () => (
  <FlashJobTimeline
    state={{
      connect: {
        started: true,
        progress: 0,
        completed: true,
      },
      download: {
        started: true,
        progress: 30,
        completed: false,
      },
      erase: {
        started: false,
        progress: 0,
        completed: false,
      },
      flash: {
        started: false,
        progress: 0,
        completed: false,
      },
    }}
  />
);

export const erasing: React.FC = () => (
  <FlashJobTimeline
    state={{
      connect: {
        started: true,
        progress: 0,
        completed: true,
      },
      download: {
        started: true,
        progress: 100,
        completed: true,
      },
      erase: {
        started: true,
        progress: 70.2,
        completed: false,
      },
      flash: {
        started: false,
        progress: 0,
        completed: false,
      },
    }}
  />
);

export const erasingFlashProtected: React.FC = () => (
  <FlashJobTimeline
    state={{
      connect: {
        started: true,
        progress: 0,
        completed: true,
      },
      download: {
        started: true,
        progress: 100,
        completed: true,
      },
      erase: {
        started: true,
        progress: 70.2,
        completed: false,
        error: "WRITE_PROTECTED",
      },
      flash: {
        started: false,
        progress: 0,
        completed: false,
      },
    }}
  />
);

export const completed: React.FC = () => (
  <FlashJobTimeline
    state={{
      connect: {
        started: true,
        progress: 0,
        completed: true,
      },
      download: {
        started: true,
        progress: 100,
        completed: true,
      },
      erase: {
        started: true,
        progress: 0,
        completed: true,
      },
      flash: {
        started: true,
        progress: 0,
        completed: true,
      },
    }}
  />
);

export const downloadError: React.FC = () => (
  <FlashJobTimeline
    state={{
      connect: {
        started: true,
        progress: 0,
        completed: true,
      },
      download: {
        started: true,
        progress: 100,
        error: "Some error :(",
        completed: false,
      },
      erase: {
        started: false,
        progress: 0,
        completed: false,
      },
      flash: {
        started: false,
        progress: 0,
        completed: false,
      },
    }}
  />
);

export const cloudbuild: React.FC = () => (
  <FlashJobTimeline
    state={{
      connect: {
        started: true,
        progress: 0,
        completed: true,
      },
      build: {
        started: true,
        progress: 0,
        completed: false,
      },
      erase: {
        started: false,
        progress: 0,
        completed: false,
      },
      flash: {
        started: false,
        progress: 0,
        completed: false,
      },
    }}
  />
);

export const cloudbuildStatus: React.FC = () => (
  <FlashJobTimeline
    state={{
      connect: {
        started: true,
        progress: 0,
        completed: true,
      },
      build: {
        started: true,
        progress: 0,
        completed: false,
        status: {
          jobStatus: "WAITING_FOR_BUILD",
          startedAt: new Date().getTime().toString(),
        },
      },
      erase: {
        started: false,
        progress: 0,
        completed: false,
      },
      flash: {
        started: false,
        progress: 0,
        completed: false,
      },
    }}
  />
);

export const cloudbuildError: React.FC = () => (
  <FlashJobTimeline
    state={{
      connect: {
        started: true,
        progress: 0,
        completed: true,
      },
      build: {
        started: true,
        progress: 0,
        status: {
          jobStatus: "WAITING_FOR_BUILD",
          startedAt: new Date().getTime().toString(),
        },
        error: "Some error :(",
        completed: false,
      },
      erase: {
        started: false,
        progress: 0,
        completed: false,
      },
      flash: {
        started: false,
        progress: 0,
        completed: false,
      },
    }}
  />
);

const useFlashingState = () => {
  const [state, setState] = useState({
    connect: {
      started: false,
      progress: 0,
      completed: false,
    },
    download: {
      started: false,
      progress: 0,
      completed: false,
    },
    erase: {
      started: false,
      progress: 0,
      completed: false,
    },
    flash: {
      started: false,
      progress: 0,
      completed: false,
    },
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setState((existing) => {
        const currentStage = ["connect", "download", "erase", "flash"].find(
          (key) => !existing[key as keyof typeof existing].completed
        ) as keyof typeof existing | undefined;

        if (!currentStage) {
          clearInterval(interval);
          return existing;
        }

        const stage = existing[currentStage];

        if (!stage.started) {
          stage.started = true;
        } else if (stage.progress < 100) {
          stage.progress += 10;
        } else {
          stage.completed = true;
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
  <FlashJobTimeline state={useFlashingState()} />
);
