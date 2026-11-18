import { useEffect, useRef, useState } from "react";
import ky from "ky";
import useCreateFirmware from "renderer/hooks/useCreateCloudFirmware";
import useFirmwareStatus from "renderer/hooks/useCloudFirmwareStatus";
import { BuildDownloadState } from "renderer/components/firmware/DownloadFirmwareTimeline";

export type CloudbuildFirmwareParams = {
  release: string;
  target: string;
  flags: { name: string; value: string }[];
};

const defaultState: BuildDownloadState = {
  build: { started: false, completed: false },
  download: { started: false, completed: false },
};

type Timeout = ReturnType<typeof setInterval>;

/**
 * Orchestrates a CloudBuild custom firmware build (trigger + poll, same
 * two GraphQL calls DownloadCloudbuildButton uses) and, once ready,
 * downloads the raw firmware bytes - handing them to the caller via
 * `onReady` instead of saving to disk, so callers can decide what to do
 * with the result (e.g. register it as local firmware for splash editing).
 */
const useCloudbuildFirmwareBytes = (): {
  state: BuildDownloadState;
  start: (
    params: CloudbuildFirmwareParams,
    onReady: (data: ArrayBuffer) => void
  ) => void;
  reset: () => void;
} => {
  const [state, setState] = useState(defaultState);
  const intervalRef = useRef<Timeout>();
  const onReadyRef = useRef<(data: ArrayBuffer) => void>();

  const createFirmware = useCreateFirmware();
  const firmwareStatus = useFirmwareStatus();

  const stopPolling = (): void => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
  };

  useEffect(() => stopPolling, []);

  const downloadBytes = async (downloadUrl: string): Promise<void> => {
    setState((prev) => ({
      ...prev,
      download: { ...prev.download, started: true },
    }));
    try {
      const response = await ky(downloadUrl, {
        headers: { origin: "null" },
      });
      const data = await response.arrayBuffer();
      setState((prev) => ({
        ...prev,
        download: { ...prev.download, completed: true },
      }));
      onReadyRef.current?.(data);
    } catch (e) {
      setState((prev) => ({
        ...prev,
        download: {
          ...prev.download,
          error: e instanceof Error ? e.message : String(e),
        },
      }));
    }
  };

  const onStatus = (buildStatus: {
    status: string;
    downloadUrl?: string | null;
  }): void => {
    const { status, downloadUrl } = buildStatus;
    const completed = !!downloadUrl;

    setState((prev) => ({
      ...prev,
      build: {
        started: true,
        status: {
          jobStatus: status,
          startedAt:
            prev.build.status?.startedAt ?? new Date().getTime().toString(),
        },
        completed,
      },
    }));

    if (status === "BUILD_ERROR") {
      stopPolling();
    } else if (completed && downloadUrl) {
      stopPolling();
      void downloadBytes(downloadUrl);
    }
  };

  const onError = (e: Error): void => {
    stopPolling();
    setState((prev) => ({
      ...prev,
      build: { ...prev.build, error: e.message },
    }));
  };

  const poll = (params: CloudbuildFirmwareParams, isFirst: boolean): void => {
    const request = isFirst ? createFirmware(params) : firmwareStatus(params);
    request.then(onStatus).catch((e: Error) => onError(e));
  };

  const start = (
    params: CloudbuildFirmwareParams,
    onReady: (data: ArrayBuffer) => void
  ): void => {
    stopPolling();
    onReadyRef.current = onReady;
    setState(defaultState);
    poll(params, true);
    intervalRef.current = setInterval(() => poll(params, false), 1000);
  };

  const reset = (): void => {
    stopPolling();
    setState(defaultState);
  };

  return { state, start, reset };
};

export default useCloudbuildFirmwareBytes;
