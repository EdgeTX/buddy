/*
 * Byte-oriented run-length encoding used for the 212x64 grayscale splash
 * payload. Ported byte-for-byte from EdgeTX Companion's RleBitmap class
 * (companion/src/storage/firmwareinterface.cpp): a literal byte is
 * emitted as-is; the moment a byte repeats immediately, the run is
 * emitted as [byte, byte, count], where the total run length is
 * count + 2 (count is 0-255, so a single run covers 2-257 occurrences).
 * Longer runs are split into consecutive groups of at most 257.
 */

// eslint-disable-next-line functional/no-class
export class RleDecodeError extends Error {}

const RUN_COUNT_MAX = 255;

export function rleEncode(data: Uint8Array): Uint8Array {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const out: number[] = [];
  let inRun = false;
  let count = 0;
  let prevByte = -1;

  for (let i = 0; i < data.length; i += 1) {
    const byte = view.getUint8(i);

    if (!inRun) {
      out.push(byte);
      if (prevByte === byte) {
        inRun = true;
        count = 0;
      } else {
        prevByte = byte;
      }
    } else if (prevByte === byte) {
      count += 1;
      if (count === RUN_COUNT_MAX) {
        out.push(count);
        prevByte = -1;
        inRun = false;
      }
    } else {
      out.push(count, byte);
      prevByte = byte;
      inRun = false;
    }
  }

  if (inRun) {
    out.push(count);
  }

  return Uint8Array.from(out);
}

export function rleDecode(data: Uint8Array, outputLength: number): Uint8Array {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const out = new Uint8Array(outputLength);
  let readPos = 0;
  let writePos = 0;

  const readByte = (): number => {
    if (readPos >= data.length) {
      throw new RleDecodeError("Unexpected end of RLE stream");
    }
    const byte = view.getUint8(readPos);
    readPos += 1;
    return byte;
  };

  while (writePos < outputLength) {
    const byte = readByte();
    const isRun = readPos < data.length && view.getUint8(readPos) === byte;

    if (!isRun) {
      out[writePos] = byte;
      writePos += 1;
    } else {
      readByte(); // consume the confirmed second occurrence
      const count = readByte();
      const runLength = count + 2;

      for (let n = 0; n < runLength && writePos < outputLength; n += 1) {
        out[writePos] = byte;
        writePos += 1;
      }
    }
  }

  return out;
}
