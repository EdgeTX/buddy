import {
  dither,
  encodeSplash,
  DitherAlgorithm,
  GrayscaleImage,
  SplashFormat,
} from "shared/splash";

export type FitMode = "letterbox" | "crop";

export type SplashCapability = {
  format: SplashFormat;
  width: number;
  height: number;
  maxBytes: number;
};

export type SplashProcessResult = {
  dithered: GrayscaleImage;
  packed?: Uint8Array;
  packError?: string;
};

/**
 * Draws a source image onto an off-screen canvas at the target
 * dimensions (letterboxed or cropped to fill) and extracts it as
 * grayscale pixel data. This is DOM-dependent glue - it can't live in
 * shared/splash, since that module also runs inside the Electron main
 * process (plain Node, no canvas/DOM available at all).
 */
const imageToGrayscale = (
  image: ImageBitmap,
  targetWidth: number,
  targetHeight: number,
  fitMode: FitMode
): GrayscaleImage => {
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context unavailable");
  }

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  const scale =
    fitMode === "letterbox"
      ? Math.min(targetWidth / image.width, targetHeight / image.height)
      : Math.max(targetWidth / image.width, targetHeight / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const offsetX = (targetWidth - drawWidth) / 2;
  const offsetY = (targetHeight - drawHeight) / 2;

  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

  const { data } = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const gray = new Uint8Array(targetWidth * targetHeight);
  for (let i = 0; i < gray.length; i += 1) {
    const r = view.getUint8(i * 4);
    const g = view.getUint8(i * 4 + 1);
    const b = view.getUint8(i * 4 + 2);
    gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  return { width: targetWidth, height: targetHeight, data: gray };
};

/**
 * Full pipeline from a source image to dithered preview pixels and the
 * packed splash payload bytes ready to send to patchFirmwareSplash.
 * Never throws - a payload that doesn't fit the reserved space (only
 * possible for the RLE-compressed grayscale format) is reported via
 * `packError` instead, so the caller can show it without losing the
 * preview.
 */
export const processSplashImage = (
  image: ImageBitmap,
  capability: SplashCapability,
  options: {
    fitMode: FitMode;
    algorithm: DitherAlgorithm;
    invert: boolean;
  }
): SplashProcessResult => {
  const grayscale = imageToGrayscale(
    image,
    capability.width,
    capability.height,
    options.fitMode
  );
  const levels = capability.format === "mono-128x64" ? 2 : 16;
  const dithered = dither(grayscale, {
    levels,
    algorithm: options.algorithm,
    invert: options.invert,
  });

  try {
    const packed = encodeSplash(dithered.data, capability.format);
    return { dithered, packed };
  } catch (e) {
    return {
      dithered,
      packError: e instanceof Error ? e.message : String(e),
    };
  }
};
