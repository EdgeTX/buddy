import { WebDFU } from "dfu";
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
} from "./usb";

export type WriteProcess = ReturnType<WebDFU["write"]>;
export type Events = WriteProcess["events"];

export const createDfuEvents = (): Events => createNanoEvents();

export const createDfuMock = (faster?: boolean): typeof dfu => {
  const startEmulation = (
    events: Events,
    type: "good" | "bad-erase" | "bad-flash" | "disconnect-bug"
  ): void => {
    void (async () => {
      await delay(100);
      events.emit("erase/start");
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
        write: () => {
          const events = createDfuEvents();

          switch (device) {
            case goodDevice:
              startEmulation(events, "good");
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
      } as unknown as WebDFU;
    },
  };
};
