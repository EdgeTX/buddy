import { WebDFU } from "dfu";
import * as dfu from "shared/backend/services/dfu";
import { delay, times } from "shared/tools";
import { createNanoEvents } from "nanoevents";
import pMap from "p-map";

type WriteProcess = ReturnType<WebDFU["write"]>;
type Events = WriteProcess["events"];

export const connect: typeof dfu.connect = async () => {
  await delay(20);
  // It does change the type...
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  const events = createNanoEvents() as Events;

  void (async () => {
    events.emit("erase/start");
    await pMap(
      times(100),
      async (progress) => {
        await delay(50);
        events.emit("erase/process", progress + 1, 100);
      },
      { concurrency: 1 }
    );
    events.emit("erase/end");

    events.emit("write/start");
    await pMap(
      times(100),
      async (progress) => {
        await delay(100);
        events.emit("write/process", progress + 1, 100);
      },
      { concurrency: 1 }
    );
    events.emit("write/end", 100);
  })();

  return {
    write: () =>
      ({
        events,
      } as WriteProcess),
  } as unknown as WebDFU;
};
