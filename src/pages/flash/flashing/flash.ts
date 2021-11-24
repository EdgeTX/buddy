import { WebDFU } from "dfu";
import { useRef, useState } from "react";
import md5 from "md5";

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
        console.log("wtf");
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

  return {
    state,
    loadFirmware: async (data) => {
      setLocalFirmware(data);
      // TODO: Work out hash
      return md5(data);
    },
    flash: async (target, version, deviceId) => {
      cancelledState.current = false;
      if (target === "local") {
        if (!localFirmware) {
          throw new Error("No local firmware set");
        }
        console.log("setting state");
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

        const dfu = await connect(deviceId);
        dfuConnection.current = dfu;

        if (!dfu || cancelledState.current) {
          return false;
        }

        return await flash(dfu, localFirmware);
      }
      return false;
    },
    cancel: async () => {
      cancelledState.current = true;
      dfuConnection.current?.close();
      reset();
    },
  };
};
