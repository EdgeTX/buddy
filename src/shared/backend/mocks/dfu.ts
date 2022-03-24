import { dfuCommands, WebDFU } from "shared/dfu";
import * as dfu from "shared/backend/services/dfu";
import { delay, times } from "shared/tools";
import { createNanoEvents } from "nanoevents";
import pMap from "p-map";
import {
  goodDevice,
  badDevice,
  errorErasingDevice,
  errorFlashingDevice,
  disconnectBugDevice,
  lockedDevice,
} from "./usb";

export type WriteProcess = ReturnType<WebDFU["write"]>;
export type Events = WriteProcess["events"];

export const createDfuEvents = (): Events => createNanoEvents();

export const createDfuMock = (faster?: boolean): typeof dfu => {
  const startEmulation = (
    events: Events,
    type: "good" | "bad-erase" | "bad-flash" | "disconnect-bug" | "locked"
  ): void => {
    void (async () => {
      await delay(100);
      events.emit("erase/start");

      if (type === "locked") {
        await delay(1000);
        events.emit("error", new Error("Special command 65 failed"));
        return;
      }

      await pMap(
        times(100),
        async (progress) => {
          if (type === "bad-erase") {
            if (progress === 30) {
              events.emit("error", new Error("Some flashing error"));
            }
            if (progress > 30) {
              return;
            }
          }

          await delay(faster ? 10 : 50);
          events.emit("erase/process", progress + 1, 100);
        },
        { concurrency: 1 }
      );

      if (type === "bad-erase") {
        return;
      }

      events.emit("erase/end");

      events.emit("write/start");
      await pMap(
        times(100),
        async (progress) => {
          if (type === "bad-flash") {
            if (progress === 40) {
              events.emit("error", new Error("Some flashing error"));
            }
            if (progress > 40) {
              return;
            }
          }

          await delay(faster ? 20 : 100);
          events.emit("write/process", progress + 1, 100);
        },
        { concurrency: 1 }
      );

      if (type === "bad-flash") {
        return;
      }

      events.emit("write/end", 100);

      if (type === "disconnect-bug") {
        return;
      }

      events.emit("end");
    })();
  };

  return {
    connect: async (device) => {
      // It does change the type...
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      await delay(faster ? 100 : 1000);

      if (device === badDevice) {
        throw new Error("Couldnt connect");
      }

      return {
        getStatus: () => {
          switch (device) {
            case lockedDevice:
              return { status: dfuCommands.STATUS_errVENDOR };
            default:
              throw new Error("Not implemented");
          }
        },
        write: () => {
          const events = createDfuEvents();

          switch (device) {
            case goodDevice:
              startEmulation(events, "good");
              break;
            case lockedDevice:
              startEmulation(events, "locked");
              break;
            case disconnectBugDevice:
              startEmulation(events, "disconnect-bug");
              break;
            case errorErasingDevice:
              startEmulation(events, "bad-erase");
              break;
            case errorFlashingDevice:
              startEmulation(events, "bad-flash");
              break;
            default:
              throw new Error("Device not found");
          }
          return {
            events,
          } as WriteProcess;
        },
        close: () => Promise.resolve(),
        forceUnprotect: async () => {
          switch (device) {
            case lockedDevice:
              await delay(5000);
              // use this to remove the device from
              // the mock device list
              await device.reset();
              break;
            default:
              await delay(2000);
              throw new Error("Some error flashing");
          }
        },
      } as unknown as WebDFU;
    },
  };
};
