import { describe, it, expect } from "vitest";
import { rleEncode, rleDecode, RleDecodeError } from "shared/splash/rle";

describe("rleEncode/rleDecode", () => {
  it("passes literal (non-repeating) bytes through unchanged", () => {
    const input = Uint8Array.from([1, 2, 3, 4, 5]);
    const encoded = rleEncode(input);
    expect(encoded).toEqual(input);
    expect(rleDecode(encoded, input.length)).toEqual(input);
  });

  it("matches the hand-traced Companion RleBitmap encoding for a mixed run", () => {
    // Ported by hand from companion/src/storage/firmwareinterface.cpp's
    // RleBitmap::encode(): four 5s then two 7s then a 3.
    const input = Uint8Array.from([5, 5, 5, 5, 7, 7, 3]);
    const encoded = rleEncode(input);
    expect(encoded).toEqual(Uint8Array.from([5, 5, 2, 7, 7, 0, 3]));
    expect(rleDecode(encoded, input.length)).toEqual(input);
  });

  it("round-trips runs right at the 257-byte single-group maximum", () => {
    const input = new Uint8Array(257).fill(42);
    const encoded = rleEncode(input);
    expect(encoded).toEqual(Uint8Array.from([42, 42, 255]));
    expect(rleDecode(encoded, input.length)).toEqual(input);
  });

  it("splits runs longer than 257 bytes into a new group", () => {
    const input = new Uint8Array(258).fill(42);
    const encoded = rleEncode(input);
    expect(encoded).toEqual(Uint8Array.from([42, 42, 255, 42]));
    expect(rleDecode(encoded, input.length)).toEqual(input);
  });

  it("round-trips a large pseudo-random buffer", () => {
    const input = new Uint8Array(6784);
    let seed = 12345;
    for (let i = 0; i < input.length; i += 1) {
      // Deterministic LCG so the test is reproducible.
      seed = (seed * 1103515245 + 12345) % 2147483648;
      input[i] = seed % 256;
    }
    const encoded = rleEncode(input);
    expect(rleDecode(encoded, input.length)).toEqual(input);
  });

  it("round-trips a buffer with many short and long runs", () => {
    const chunks = [
      new Uint8Array(1).fill(9),
      new Uint8Array(2).fill(1),
      new Uint8Array(3).fill(1),
      new Uint8Array(300).fill(0),
      new Uint8Array(5).fill(200),
    ];
    const input = new Uint8Array(chunks.reduce((sum, c) => sum + c.length, 0));
    let offset = 0;
    chunks.forEach((chunk) => {
      input.set(chunk, offset);
      offset += chunk.length;
    });

    const encoded = rleEncode(input);
    expect(rleDecode(encoded, input.length)).toEqual(input);
  });

  it("throws RleDecodeError on a truncated stream", () => {
    // Claims a run ("5,5,<count>") but the count byte is missing.
    const truncated = Uint8Array.from([5, 5]);
    expect(() => rleDecode(truncated, 10)).toThrow(RleDecodeError);
  });

  it("throws RleDecodeError when asked to decode more bytes than the stream provides", () => {
    const input = Uint8Array.from([1, 2, 3]);
    expect(() => rleDecode(input, 10)).toThrow(RleDecodeError);
  });
});
