import { Blob } from "buffer";

globalThis.Blob = Blob as unknown as typeof globalThis.Blob;
