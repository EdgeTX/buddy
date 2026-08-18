/*
 * Grayscale quantization/dithering for splash images. Pure pixel-array
 * functions with no canvas/DOM dependency, so they can be unit tested
 * with plain synthetic arrays. Companion itself relies on Qt's default
 * QImage::Format_Mono conversion (an ordered dither) with no explicit
 * algorithm of its own; there's no compatibility requirement to match
 * that exactly, only the final packed bytes read by firmware matter, so
 * this implements real Floyd-Steinberg error diffusion for better
 * visual results at low bit depths.
 */

export type GrayscaleImage = {
  width: number;
  height: number;
  /** Row-major grayscale pixel values, 0 (black) to 255 (white), one byte per pixel. */
  data: Uint8Array;
};

export type DitherAlgorithm = "floyd-steinberg" | "threshold";

export type DitherOptions = {
  /** Number of quantized gray levels, e.g. 2 for 1bpp mono, 16 for 4bpp grayscale. */
  levels: number;
  algorithm?: DitherAlgorithm;
  invert?: boolean;
};

const clamp255 = (value: number): number => Math.min(255, Math.max(0, value));

/** Quantizes a 0-255 value to one of `levels` evenly-spaced gray levels. */
const quantize = (value: number, levels: number): number => {
  const steps = levels - 1;
  const step = Math.round((clamp255(value) / 255) * steps);
  return Math.round((step / steps) * 255);
};

export function dither(
  image: GrayscaleImage,
  options: DitherOptions
): GrayscaleImage {
  const { width, height, data } = image;
  const { levels, algorithm = "floyd-steinberg", invert = false } = options;

  if (data.length !== width * height) {
    throw new Error(`Expected ${width * height} pixels, got ${data.length}`);
  }

  const dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const out = new Uint8Array(width * height);

  if (algorithm === "threshold") {
    for (let i = 0; i < data.length; i += 1) {
      const raw = dataView.getUint8(i);
      out[i] = quantize(invert ? 255 - raw : raw, levels);
    }
    return { width, height, data: out };
  }

  // Floyd-Steinberg error diffusion, working on a float buffer so
  // accumulated error isn't lost to integer rounding between pixels.
  // Diffused error is only clamped when a pixel is quantized, not on
  // every diffusion step - standard for this algorithm.
  const buffer = new Float64Array(width * height);
  for (let i = 0; i < data.length; i += 1) {
    const raw = dataView.getUint8(i);
    buffer[i] = invert ? 255 - raw : raw;
  }

  const diffuse = (
    x: number,
    y: number,
    error: number,
    weight: number
  ): void => {
    if (x < 0 || x >= width || y < 0 || y >= height) {
      return;
    }
    buffer[y * width + x] += error * weight;
  };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = y * width + x;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const oldValue = buffer[idx]!;
      const newValue = quantize(oldValue, levels);
      out[idx] = newValue;
      const error = oldValue - newValue;

      diffuse(x + 1, y, error, 7 / 16);
      diffuse(x - 1, y + 1, error, 3 / 16);
      diffuse(x, y + 1, error, 5 / 16);
      diffuse(x + 1, y + 1, error, 1 / 16);
    }
  }

  return { width, height, data: out };
}
