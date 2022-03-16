/* eslint-disable functional/no-class */
/* eslint-disable max-classes-per-file */
import { createNanoEvents } from "nanoevents";
import type { Emitter } from "nanoevents";

export type WebDFUProcessReadEvents = {
  process: (done: number, total?: number) => void;
  error: (error: unknown) => void;
  end: (data: Blob) => void;
};

export type WebDFUProcessWriteEvents = {
  "erase/start": () => void;
  "erase/process": WebDFUProcessEraseEvents["process"];
  "erase/end": WebDFUProcessEraseEvents["end"];

  "write/start": () => void;
  "write/process": (bytesSent: number, expectedSize: number) => void;
  "write/end": (bytesSent: number) => void;

  verify: (status: {
    status: number;
    pollTimeout: number;
    state: number;
  }) => void;

  error: (error: Error) => void;
  end: () => void;
};

export type WebDFUProcessEraseEvents = {
  process: (bytesSent: number, expectedSize: number) => void;
  error: (error: Error) => void;
  end: () => void;
};

export type WebDFUProcess<T> = {
  events: Emitter<T>;
};

export class WebDFUProcessRead
  implements WebDFUProcess<WebDFUProcessReadEvents>
{
  events = createNanoEvents<WebDFUProcessReadEvents>();
}

export class WebDFUProcessWrite
  implements WebDFUProcess<WebDFUProcessWriteEvents>
{
  events = createNanoEvents<WebDFUProcessWriteEvents>();
}

export class WebDFUProcessErase
  implements WebDFUProcess<WebDFUProcessEraseEvents>
{
  events = createNanoEvents<WebDFUProcessEraseEvents>();
}
