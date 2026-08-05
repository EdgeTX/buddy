import { describe, it, expect } from "vitest";
import {
  findSplash,
  decodeSplash,
  encodeSplash,
  patchSplash,
  SplashCodecError,
} from "shared/splash/codec";
import { SPLASH_FORMATS, SplashFormat } from "shared/splash/boards";

const SPS = [0x53, 0x50, 0x53, 0x00]; // "SPS\0"
const SPE = [0x53, 0x50, 0x45, 0x00]; // "SPE\0"

const MARKER_SUFFIX: Record<SplashFormat, [number, number]> = {
  "mono-128x64": [128, 64],
  "grayscale-212x64": [212, 64],
};

/** Builds a synthetic firmware image with a valid splash marker for `format`. */
const buildFirmware = (
  format: SplashFormat,
  options: {
    leadingJunk?: number;
    trailingJunk?: number;
    payload?: Uint8Array;
  } = {}
): { firmware: Uint8Array; payloadOffset: number } => {
  const reservedSize = SPLASH_FORMATS[format].maxBytes;
  const [markerWidth, markerHeight] = MARKER_SUFFIX[format];
  const leadingJunk = options.leadingJunk ?? 16;
  const trailingJunk = options.trailingJunk ?? 16;
  const payload = options.payload ?? new Uint8Array(reservedSize);

  if (payload.length > reservedSize) {
    throw new Error("payload too big for test fixture");
  }

  const parts = [
    new Uint8Array(leadingJunk).fill(0xaa),
    Uint8Array.from([...SPS, markerWidth, markerHeight]),
    payload,
    new Uint8Array(reservedSize - payload.length), // pad up to reservedSize
    Uint8Array.from(SPE),
    new Uint8Array(trailingJunk).fill(0xbb),
  ];

  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const firmware = new Uint8Array(totalLength);
  let offset = 0;
  parts.forEach((part) => {
    firmware.set(part, offset);
    offset += part.length;
  });

  const payloadOffset = leadingJunk + SPS.length + 2;
  return { firmware, payloadOffset };
};

/** The 16 exactly-representable gray levels for the 4bpp grayscale format. */
const GRAYSCALE_LEVELS = Array.from({ length: 16 }, (_, n) =>
  Math.max(0, 255 - Math.floor((n * 255) / 15))
);

describe("findSplash", () => {
  it("locates a valid mono-128x64 marker", () => {
    const { firmware, payloadOffset } = buildFirmware("mono-128x64");
    const location = findSplash(firmware);
    expect(location).toEqual({
      format: "mono-128x64",
      width: 128,
      height: 64,
      payloadOffset,
      reservedSize: 1024,
    });
  });

  it("locates a valid grayscale-212x64 marker", () => {
    const { firmware, payloadOffset } = buildFirmware("grayscale-212x64");
    const location = findSplash(firmware);
    expect(location).toEqual({
      format: "grayscale-212x64",
      width: 212,
      height: 64,
      payloadOffset,
      reservedSize: 3070,
    });
  });

  it("returns undefined when no marker is present", () => {
    const firmware = new Uint8Array(4096).fill(0xff);
    expect(findSplash(firmware)).toBeUndefined();
  });

  it("skips a prefix match whose SPE suffix is missing/misplaced and finds a later valid one", () => {
    const { firmware: valid } = buildFirmware("mono-128x64", {
      leadingJunk: 0,
    });

    // A fake marker (SPS + correct width/height bytes) with garbage instead
    // of a correctly-positioned SPE - must be rejected, not mistaken for a
    // real splash region.
    const fakeMarker = Uint8Array.from([...SPS, 128, 64]);
    const fakeFiller = new Uint8Array(1024).fill(0xcc); // no SPE at the right spot

    const combined = new Uint8Array(
      fakeMarker.length + fakeFiller.length + valid.length
    );
    combined.set(fakeMarker, 0);
    combined.set(fakeFiller, fakeMarker.length);
    combined.set(valid, fakeMarker.length + fakeFiller.length);

    const location = findSplash(combined);
    expect(location).toBeDefined();
    expect(location?.payloadOffset).toBe(
      fakeMarker.length + fakeFiller.length + SPS.length + 2
    );
  });

  it("prefers mono over grayscale when both markers are present, matching Companion's own search order", () => {
    const mono = buildFirmware("mono-128x64", {
      leadingJunk: 0,
      trailingJunk: 0,
    });
    const grayscale = buildFirmware("grayscale-212x64", {
      leadingJunk: 0,
      trailingJunk: 0,
    });
    // Grayscale bytes placed first in the buffer - mono should still win,
    // since findSplash searches the whole buffer for a mono match before
    // ever trying the grayscale format (mirrors FirmwareInterface::seekSplash()).
    const combined = new Uint8Array(
      grayscale.firmware.length + mono.firmware.length
    );
    combined.set(grayscale.firmware, 0);
    combined.set(mono.firmware, grayscale.firmware.length);

    const location = findSplash(combined);
    expect(location?.format).toBe("mono-128x64");
  });
});

describe("encodeSplash/decodeSplash round-trip", () => {
  it("round-trips a black/white checkerboard for mono-128x64", () => {
    const { width, height } = SPLASH_FORMATS["mono-128x64"];
    const pixels = new Uint8Array(width * height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        pixels[y * width + x] = (x + y) % 2 === 0 ? 0 : 255;
      }
    }

    const packed = encodeSplash(pixels, "mono-128x64");
    expect(packed.length).toBe(1024);

    const { firmware } = buildFirmware("mono-128x64", { payload: packed });
    const location = findSplash(firmware);
    expect(location).toBeDefined();
    if (!location) throw new Error("expected location");

    const decoded = decodeSplash(firmware, location);
    expect(decoded).toEqual(pixels);
  });

  it("round-trips the 16 exactly-representable gray levels for grayscale-212x64", () => {
    const { width, height } = SPLASH_FORMATS["grayscale-212x64"];
    const pixels = new Uint8Array(width * height);
    // Horizontal bands (not a per-pixel cycle) so the packed raw buffer has
    // long runs and compresses well under the 3070-byte budget - a
    // realistic shape for an actual splash image, unlike per-pixel noise.
    const rowsPerBand = Math.ceil(height / GRAYSCALE_LEVELS.length);
    for (let y = 0; y < height; y += 1) {
      const level = Math.floor(y / rowsPerBand);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const gray = GRAYSCALE_LEVELS[level]!;
      for (let x = 0; x < width; x += 1) {
        pixels[y * width + x] = gray;
      }
    }

    const packed = encodeSplash(pixels, "grayscale-212x64");
    expect(packed.length).toBeLessThanOrEqual(3070);

    const { firmware } = buildFirmware("grayscale-212x64", {
      payload: packed,
    });
    const location = findSplash(firmware);
    expect(location).toBeDefined();
    if (!location) throw new Error("expected location");

    const decoded = decodeSplash(firmware, location);
    expect(decoded).toEqual(pixels);
  });

  it("throws SplashCodecError for a pixel array of the wrong length", () => {
    expect(() => encodeSplash(new Uint8Array(10), "mono-128x64")).toThrow(
      SplashCodecError
    );
  });

  it("throws SplashCodecError when the compressed grayscale payload exceeds reserved space", () => {
    const { width, height } = SPLASH_FORMATS["grayscale-212x64"];
    const pixels = new Uint8Array(width * height);
    let seed = 987654321;
    for (let i = 0; i < pixels.length; i += 1) {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      pixels[i] = seed % 256;
    }

    expect(() => encodeSplash(pixels, "grayscale-212x64")).toThrow(
      SplashCodecError
    );
  });
});

describe("patchSplash", () => {
  it("keeps the total firmware length unchanged for a full-size payload", () => {
    const { firmware } = buildFirmware("mono-128x64");
    const location = findSplash(firmware);
    if (!location) throw new Error("expected location");

    const newPayload = new Uint8Array(1024).fill(0x11);
    const patched = patchSplash(firmware, location, newPayload);

    expect(patched.length).toBe(firmware.length);
    expect(
      patched.slice(location.payloadOffset, location.payloadOffset + 1024)
    ).toEqual(newPayload);
  });

  it("keeps the total firmware length unchanged for a shrunk (RLE-compressed) payload", () => {
    const { firmware } = buildFirmware("grayscale-212x64");
    const location = findSplash(firmware);
    if (!location) throw new Error("expected location");

    // An all-white image compresses to a handful of bytes, well under 3070.
    const { width, height } = SPLASH_FORMATS["grayscale-212x64"];
    const pixels = new Uint8Array(width * height).fill(255);
    const packed = encodeSplash(pixels, "grayscale-212x64");
    expect(packed.length).toBeLessThan(3070);

    const patched = patchSplash(firmware, location, packed);
    expect(patched.length).toBe(firmware.length);
    expect(
      patched.slice(
        location.payloadOffset,
        location.payloadOffset + packed.length
      )
    ).toEqual(packed);

    // Bytes before the payload and the SPE suffix marker are untouched.
    expect(patched.slice(0, location.payloadOffset)).toEqual(
      firmware.slice(0, location.payloadOffset)
    );
    const speOffset = location.payloadOffset + location.reservedSize;
    expect(patched.slice(speOffset, speOffset + 4)).toEqual(
      firmware.slice(speOffset, speOffset + 4)
    );
  });

  it("throws SplashCodecError when the packed payload doesn't fit in the reserved space", () => {
    const { firmware } = buildFirmware("mono-128x64");
    const location = findSplash(firmware);
    if (!location) throw new Error("expected location");

    expect(() => patchSplash(firmware, location, new Uint8Array(2000))).toThrow(
      SplashCodecError
    );
  });
});
