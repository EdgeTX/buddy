import { WebDFU } from "dfu";
import { useRef, useState } from "react";
import md5 from "md5";
import { gql } from "@apollo/client";
import { isNotNullOrUndefined } from "type-guards";
import { fetchFirmware } from "../../store/firmware";
import client from "../../../gql/client";

export type FlashingStageStatus = {
  progress: number;
  started: boolean;
  completed: boolean;
  error?: string;
};

export type FlashingState = {
  connection: FlashingStageStatus;
  building?: FlashingStageStatus;
  downloading?: FlashingStageStatus;
  erasing: FlashingStageStatus;
  flashing: FlashingStageStatus;
};

type Result = {
  state?: FlashingState;
  // Loads the firmware and returns the hash string
  loadFirmware: (data: Buffer) => Promise<string>;
  flash: (
    target: string,
    version: string,
    deviceId: string
  ) => Promise<boolean>;
  cancel: () => Promise<void>;
};

export const useFlasher = (): Result => {
  const cancelledState = useRef<boolean>();
  const dfuConnection = useRef<WebDFU>();
  const [state, setState] = useState<FlashingState>();
  const [localFirmware, setLocalFirmware] = useState<Buffer>();

  const reset = () => {
    setState(undefined);
  };

  const updateState = (newState: Partial<FlashingState>) => {
    if (cancelledState.current) {
      return;
    }
    setState((oldState) => {
      if (oldState === undefined) {
        throw new Error("Initial state must be set before updated");
      }
      return { ...oldState, ...newState };
    });
  };

  const connect = async (deviceId: string): Promise<WebDFU | undefined> => {
    try {
      updateState({
        connection: {
          started: true,
          completed: false,
          progress: 0,
        },
      });

      const device = (await navigator.usb.getDevices()).find(
        ({ vendorId, productId, serialNumber }) =>
          deviceId.indexOf(":") > 0
            ? `${vendorId}:${productId}` === deviceId
            : deviceId === serialNumber
      );

      if (!device) {
        throw new Error("Device not found");
      }

      const dfu = new WebDFU(
        device,
        { forceInterfacesName: true },
        { info: console.log, progress: console.log, warning: console.log }
      );

      console.log("Initialising");

      await dfu.init();

      if (dfu.interfaces.length === 0) {
        throw new Error("Device does not have any USB DFU interfaces.");
      }

      console.log("connecting");
      await dfu.connect(0);
      console.log("configuring");
      if (await dfu.isError()) {
        await dfu.clearStatus();
      }

      updateState({
        connection: {
          started: true,
          completed: true,
          progress: 0,
        },
      });

      return dfu;
    } catch (e) {
      console.log(e);
      updateState({
        connection: {
          started: true,
          completed: false,
          progress: 0,
          error: (e as Error).message,
        },
      });
      return undefined;
    }
  };

  const flash = async (dfu: WebDFU, firmware: Buffer): Promise<boolean> => {
    try {
      const process = dfu.write(
        dfu.properties?.TransferSize ?? 1024,
        firmware,
        true
      );

      await new Promise<void>((resolve, reject) => {
        let stage = "erase" as "erase" | "flash";
        process.events.on("error", (err: Error) => {
          if (stage === "erase") {
            updateState({
              erasing: {
                started: true,
                progress: 0,
                error: err.message,
                completed: false,
              },
            });
          } else {
            updateState({
              flashing: {
                started: true,
                progress: 0,
                error: err.message,
                completed: false,
              },
            });
          }
          reject(err);
        });

        process.events.on("erase/start", () => {
          updateState({
            erasing: {
              started: true,
              progress: 0,
              completed: false,
            },
          });
        });
        process.events.on("erase/process", (progress) => {
          updateState({
            erasing: {
              started: true,
              progress: (progress / firmware.byteLength) * 100,
              completed: false,
            },
          });
        });
        process.events.on("erase/end", () => {
          updateState({
            erasing: {
              started: true,
              progress: 100,
              completed: true,
            },
          });
        });

        process.events.on("write/start", () => {
          stage = "flash";
          updateState({
            flashing: {
              started: true,
              progress: 0,
              completed: false,
            },
          });
        });
        process.events.on("write/process", (progress) => {
          updateState({
            flashing: {
              started: true,
              progress: (progress / firmware.byteLength) * 100,
              completed: false,
            },
          });
        });

        process.events.on("end", () => {
          updateState({
            flashing: {
              started: true,
              progress: 100,
              completed: true,
            },
          });
          resolve();
        });
      });

      return true;
    } catch (error) {
      return false;
    }
  };

  const download = async (
    target: string,
    version: string
  ): Promise<Buffer | undefined> => {
    try {
      updateState({
        downloading: {
          started: true,
          completed: false,
          progress: 0,
        },
      });
      const firmwareUrlQuery = await client.query({
        query: gql(/* GraphQL */ `
          query ReleaseAssets($tagName: String!) {
            repository(name: "edgetx", owner: "EdgeTX") {
              id
              release(tagName: $tagName) {
                id
                releaseAssets(first: 100) {
                  nodes {
                    id
                    name
                    url
                  }
                }
              }
            }
          }
        `),
        variables: {
          tagName: version,
        },
      });

      const firmwareBundleUrl =
        firmwareUrlQuery.data.repository?.release?.releaseAssets?.nodes
          ?.filter(isNotNullOrUndefined)
          .find((release) => release.name.indexOf("firmware") > -1)?.url;

      if (!firmwareBundleUrl) {
        throw new Error("Could not find specified firmware");
      }

      updateState({
        downloading: {
          started: true,
          completed: false,
          progress: 20,
        },
      });

      const firmware = await fetchFirmware(firmwareBundleUrl, target);
      updateState({
        downloading: {
          started: true,
          completed: true,
          progress: 100,
        },
      });

      return firmware;
    } catch (e) {
      updateState({
        downloading: {
          started: true,
          completed: false,
          progress: 0,
          error: (e as Error).message,
        },
      });

      return undefined;
    }
  };

  return {
    state,
    loadFirmware: async (data) => {
      setLocalFirmware(data);
      // TODO: Work out hash
      return md5(data);
    },
    flash: async (target, version, deviceId) => {
      let firmware: Buffer | undefined;
      cancelledState.current = false;
      if (target === "local") {
        if (!localFirmware) {
          throw new Error("No local firmware set");
        }
        firmware = localFirmware;
      }

      // If we already have the firmware we don't need to download
      // So start the state off assuming no download step
      if (firmware) {
        setState({
          connection: {
            started: false,
            completed: false,
            progress: 0,
          },
          erasing: {
            started: false,
            completed: false,
            progress: 0,
          },
          flashing: {
            started: false,
            completed: false,
            progress: 0,
          },
        });
      } else {
        setState({
          downloading: {
            started: false,
            completed: false,
            progress: 0,
          },
          connection: {
            started: false,
            completed: false,
            progress: 0,
          },
          erasing: {
            started: false,
            completed: false,
            progress: 0,
          },
          flashing: {
            started: false,
            completed: false,
            progress: 0,
          },
        });
      }

      const dfu = await connect(deviceId);
      dfuConnection.current = dfu;

      if (!dfu || cancelledState.current) {
        return false;
      }

      if (!firmware) {
        firmware = await download(target, version);
        if (!firmware) {
          return false;
        }
      }

      return flash(dfu, firmware);
    },
    cancel: async () => {
      cancelledState.current = true;
      dfuConnection.current?.close();
      reset();
    },
  };
};
