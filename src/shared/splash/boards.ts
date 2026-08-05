/*
 * Board -> splash format mapping for EdgeTX black-and-white/grayscale radios.
 *
 * EdgeTX firmware embeds a boot splash bitmap directly in the compiled
 * firmware binary for two families of non-color-LCD boards, in two
 * different pixel formats (see codec.ts for the byte-level format).
 * Color-LCD radios load "splash.png" from the SD card at boot instead
 * and have no embedded splash to patch, so they're intentionally absent
 * from this table.
 *
 * Target codes and their "stdlcd"/"colorlcd" classification are a
 * snapshot verified against https://cloudbuild.edgetx.org/api/targets
 * on 2026-08-05. Re-verify against that endpoint when new B&W boards
 * ship.
 */

export type SplashFormat = "mono-128x64" | "grayscale-212x64";

export type SplashFormatInfo = {
  width: number;
  height: number;
  /** Maximum bytes available for the packed payload in the firmware binary. */
  maxBytes: number;
};

export const SPLASH_FORMATS: Record<SplashFormat, SplashFormatInfo> = {
  "mono-128x64": { width: 128, height: 64, maxBytes: 1024 },
  "grayscale-212x64": { width: 212, height: 64, maxBytes: 3070 },
};

// X9D-family boards use the 212x64 4bpp grayscale + RLE splash format.
const GRAYSCALE_212X64_TARGETS = new Set(["x9d", "x9dp", "x9dp2019", "x9e"]);

// All other "stdlcd" (non-color) targets use the 128x64 1bpp mono format.
const STDLCD_TARGETS = new Set([
  "boxer",
  "bumblebee",
  "commando8",
  "gx12",
  "lr3pro",
  "mt12",
  "pocket",
  "t8",
  "t12",
  "t12max",
  "t14",
  "t20",
  "t20v2",
  "tlite",
  "tpro",
  "tpros",
  "tprov2",
  "tx12",
  "tx12mk2",
  "v14",
  "x7",
  "x7-access",
  "x7access",
  "x9d",
  "x9dp",
  "x9dp2019",
  "x9e",
  "x9lite",
  "x9lites",
  "xlite",
  "xlites",
  "zorro",
]);

export type SplashBoardInfo = { format: SplashFormat } & SplashFormatInfo;

/**
 * Looks up the splash format for a known cloudbuild/release target code.
 * Returns undefined for color-LCD boards and unrecognized codes. For
 * locally-uploaded firmware with no known target code, use findSplash()
 * from codec.ts to detect the format directly from the binary instead.
 */
export const getSplashBoardInfo = (
  targetCode: string
): SplashBoardInfo | undefined => {
  if (!STDLCD_TARGETS.has(targetCode)) {
    return undefined;
  }

  const format: SplashFormat = GRAYSCALE_212X64_TARGETS.has(targetCode)
    ? "grayscale-212x64"
    : "mono-128x64";

  return { format, ...SPLASH_FORMATS[format] };
};
