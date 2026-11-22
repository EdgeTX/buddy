/*
 * Splash screen patch codec for EdgeTX firmware binaries, ported from
 * EdgeTX Companion's FirmwareInterface (companion/src/storage/firmwareinterface.cpp).
 *
 * EdgeTX firmware wraps its compiled-in splash bitmap with fixed ASCII
 * markers precisely so external tools can locate and patch it in a
 * compiled .bin without recompiling:
 *
 *   "SPS\0" <width-byte> <height-byte> <payload bytes...> "SPE\0"
 *
 * The width/height bytes double as the format identifier (128,64 for
 * 1bpp mono boards; 212,64 for 4bpp grayscale+RLE X9D-family boards)
 * and as a validation check: a match only counts if the "SPE\0" suffix
 * is found exactly `reservedSize` bytes after the payload starts,
 * where reservedSize is the format's fixed maximum (1024 or 3070).
 *
 * IMPORTANT: patching is always a same-length, in-place overwrite of
 * [payloadOffset, payloadOffset + packed.length) - never a splice that
 * changes the firmware's total length. Companion's own setSplash() does
 * this (QByteArray::replace with equal old/new lengths); any unused
 * tail bytes up to reservedSize are left as-is, which is safe because
 * the firmware's own decoder only reads the number of bytes it expects
 * for the image's actual pixel count.
 */

import { rleDecode, rleEncode } from "./rle";
import { SPLASH_FORMATS, SplashFormat } from "./boards";

/* eslint-disable no-bitwise */

// eslint-disable-next-line functional/no-class
export class SplashCodecError extends Error {}

export type SplashLocation = {
  format: SplashFormat;
  width: number;
  height: number;
  /** Offset of the first payload byte, immediately after the SPS marker's width/height bytes. */
  payloadOffset: number;
  /** Maximum bytes available for the payload (1024 for mono, 3070 for grayscale). */
  reservedSize: number;
};

const SPS_PREFIX: readonly number[] = [0x53, 0x50, 0x53, 0x00]; // "SPS\0"
const SPE_MARKER = Uint8Array.from([0x53, 0x50, 0x45, 0x00]); // "SPE\0"

const FORMAT_SEARCH_ORDER: readonly SplashFormat[] = [
  "mono-128x64",
  "grayscale-212x64",
];

function indexOfBytes(
  haystack: Uint8Array,
  needle: Uint8Array,
  fromIndex: number
): number {
  const haystackView = new DataView(
    haystack.buffer,
    haystack.byteOffset,
    haystack.byteLength
  );
  const needleView = new DataView(
    needle.buffer,
    needle.byteOffset,
    needle.byteLength
  );
  const limit = haystack.length - needle.length;

  for (let i = Math.max(fromIndex, 0); i <= limit; i += 1) {
    let matched = true;
    for (let j = 0; j < needle.length; j += 1) {
      if (haystackView.getUint8(i + j) !== needleView.getUint8(j)) {
        matched = false;
        break;
      }
    }
    if (matched) {
      return i;
    }
  }

  return -1;
}

function bytesMatchAt(
  haystack: Uint8Array,
  offset: number,
  needle: Uint8Array
): boolean {
  if (offset < 0 || offset + needle.length > haystack.length) {
    return false;
  }
  const haystackView = new DataView(
    haystack.buffer,
    haystack.byteOffset,
    haystack.byteLength
  );
  const needleView = new DataView(
    needle.buffer,
    needle.byteOffset,
    needle.byteLength
  );
  for (let j = 0; j < needle.length; j += 1) {
    if (haystackView.getUint8(offset + j) !== needleView.getUint8(j)) {
      return false;
    }
  }
  return true;
}

function trySeekSplash(
  firmware: Uint8Array,
  format: SplashFormat
): SplashLocation | undefined {
  const { width, height, maxBytes: reservedSize } = SPLASH_FORMATS[format];
  const marker = Uint8Array.from([...SPS_PREFIX, width, height]);

  let searchFrom = 0;
  let markerIndex = indexOfBytes(firmware, marker, searchFrom);

  while (markerIndex !== -1) {
    const payloadOffset = markerIndex + marker.length;

    if (bytesMatchAt(firmware, payloadOffset + reservedSize, SPE_MARKER)) {
      return { format, width, height, payloadOffset, reservedSize };
    }

    searchFrom = markerIndex + 1;
    markerIndex = indexOfBytes(firmware, marker, searchFrom);
  }

  return undefined;
}

/** Locates the splash region in a firmware binary, auto-detecting format. */
export function findSplash(firmware: Uint8Array): SplashLocation | undefined {
  for (let i = 0; i < FORMAT_SEARCH_ORDER.length; i += 1) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const format = FORMAT_SEARCH_ORDER[i]!;
    const location = trySeekSplash(firmware, format);
    if (location) {
      return location;
    }
  }
  return undefined;
}

/**
 * Unpacks the currently-embedded splash into 8-bit grayscale pixels
 * (0 = black, 255 = white), row-major, width*height bytes long.
 */
export function decodeSplash(
  firmware: Uint8Array,
  location: SplashLocation
): Uint8Array {
  const { format, width, height, payloadOffset, reservedSize } = location;
  const pixels = new Uint8Array(width * height);

  if (format === "mono-128x64") {
    const view = new DataView(
      firmware.buffer,
      firmware.byteOffset,
      firmware.byteLength
    );
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const byteIndex = payloadOffset + width * Math.floor(y / 8) + x;
        const byte = view.getUint8(byteIndex);
        const bitSet = (byte & (1 << y % 8)) !== 0;
        pixels[y * width + x] = bitSet ? 0 : 255;
      }
    }
    return pixels;
  }

  const rawLength = (width * height) / 2;
  const compressed = firmware.slice(
    payloadOffset,
    payloadOffset + reservedSize
  );
  const raw = rleDecode(compressed, rawLength);
  const rawView = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);

  for (let y = 0; y < height; y += 1) {
    const rowPairIndex = Math.floor(y / 2) * width;
    for (let x = 0; x < width; x += 1) {
      const byte = rawView.getUint8(rowPairIndex + x);
      const nibble = y % 2 === 1 ? (byte >> 4) & 0x0f : byte & 0x0f;
      pixels[y * width + x] = 255 - Math.floor((nibble * 255) / 15);
    }
  }
  return pixels;
}

/**
 * Packs 8-bit grayscale pixels (0 = black, 255 = white, row-major,
 * width*height bytes) into the exact on-disk splash payload layout for
 * the given format. Throws SplashCodecError if the RLE-compressed
 * grayscale payload exceeds its reserved space.
 */
export function encodeSplash(
  pixels: Uint8Array,
  format: SplashFormat
): Uint8Array {
  const { width, height, maxBytes } = SPLASH_FORMATS[format];
  if (pixels.length !== width * height) {
    throw new SplashCodecError(
      `Expected ${width * height} pixels for ${format}, got ${pixels.length}`
    );
  }
  const pixelsView = new DataView(
    pixels.buffer,
    pixels.byteOffset,
    pixels.byteLength
  );

  if (format === "mono-128x64") {
    const packed = new Uint8Array((width * height) / 8);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const isBlack = pixelsView.getUint8(y * width + x) < 128;
        if (isBlack) {
          const idx = width * Math.floor(y / 8) + x;
          packed[idx] |= 1 << y % 8;
        }
      }
    }
    return packed;
  }

  const rawLength = (width * height) / 2;
  const raw = new Uint8Array(rawLength);
  for (let y = 0; y < height; y += 1) {
    const rowPairIndex = Math.floor(y / 2) * width;
    for (let x = 0; x < width; x += 1) {
      const gray = pixelsView.getUint8(y * width + x);
      const nibble = Math.floor(((255 - gray) * 15) / 255);
      const idx = rowPairIndex + x;
      raw[idx] |= y % 2 === 1 ? nibble << 4 : nibble;
    }
  }

  const compressed = rleEncode(raw);
  if (compressed.length > maxBytes) {
    throw new SplashCodecError(
      `Compressed splash image (${compressed.length} bytes) exceeds the ${maxBytes}-byte reserved space for this firmware`
    );
  }
  return compressed;
}

/**
 * Returns a new firmware image with the splash payload replaced.
 * Always the same total length as `firmware` - only the bytes in
 * [location.payloadOffset, location.payloadOffset + packed.length) change.
 */
export function patchSplash(
  firmware: Uint8Array,
  location: SplashLocation,
  packed: Uint8Array
): Uint8Array {
  if (packed.length > location.reservedSize) {
    throw new SplashCodecError(
      `Packed splash payload (${packed.length} bytes) exceeds the ${location.reservedSize}-byte reserved space`
    );
  }

  const patched = firmware.slice();
  patched.set(packed, location.payloadOffset);
  return patched;
}
