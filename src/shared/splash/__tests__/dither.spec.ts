import { describe, it, expect } from "vitest";
import { dither } from "shared/splash/dither";

describe("dither", () => {
  it("threshold: keeps a pure white image white at 2 levels", () => {
    const data = new Uint8Array(16).fill(255);
    const result = dither(
      { width: 4, height: 4, data },
      { levels: 2, algorithm: "threshold" }
    );
    expect(result.data).toEqual(new Uint8Array(16).fill(255));
  });

  it("threshold: keeps a pure black image black at 2 levels", () => {
    const data = new Uint8Array(16).fill(0);
    const result = dither(
      { width: 4, height: 4, data },
      { levels: 2, algorithm: "threshold" }
    );
    expect(result.data).toEqual(new Uint8Array(16).fill(0));
  });

  it("threshold: quantizes around the midpoint", () => {
    const data = Uint8Array.from([127, 128]);
    const result = dither(
      { width: 2, height: 1, data },
      { levels: 2, algorithm: "threshold" }
    );
    expect(result.data).toEqual(Uint8Array.from([0, 255]));
  });

  it("threshold: invert flips before quantizing", () => {
    const data = new Uint8Array(4).fill(0);
    const result = dither(
      { width: 4, height: 1, data },
      { levels: 2, algorithm: "threshold", invert: true }
    );
    expect(result.data).toEqual(new Uint8Array(4).fill(255));
  });

  it("floyd-steinberg: matches the hand-computed error diffusion for a 2x1 mid-gray strip", () => {
    // width=2,height=1, both pixels=128, levels=2:
    // pixel(0,0): newValue=255 (128/255 rounds up to level 1), error=128-255=-127,
    //   diffused to (1,0) with weight 7/16 -> buffer[1] = 128 + (-127*7/16) = 72.4375
    // pixel(1,0): quantize(72.4375, 2) = 0
    const data = Uint8Array.from([128, 128]);
    const result = dither(
      { width: 2, height: 1, data },
      { levels: 2, algorithm: "floyd-steinberg" }
    );
    expect(result.data).toEqual(Uint8Array.from([255, 0]));
  });

  it("floyd-steinberg: leaves a pure white image white (no error to diffuse)", () => {
    const data = new Uint8Array(64).fill(255);
    const result = dither(
      { width: 8, height: 8, data },
      { levels: 2, algorithm: "floyd-steinberg" }
    );
    expect(result.data).toEqual(new Uint8Array(64).fill(255));
  });

  it("quantizes to 16 evenly-spaced levels for the grayscale format", () => {
    const data = Uint8Array.from([0, 17, 238, 255]);
    const result = dither(
      { width: 4, height: 1, data },
      { levels: 16, algorithm: "threshold" }
    );
    // Every output value must be one of the 16 representable levels
    // (255 - floor(n*255/15) for n in 0..15).
    const validLevels = new Set(
      Array.from({ length: 16 }, (_, n) => 255 - Math.floor((n * 255) / 15))
    );
    result.data.forEach((value) => {
      expect(validLevels.has(value)).toBe(true);
    });
  });

  it("throws for a pixel array of the wrong length", () => {
    expect(() =>
      dither({ width: 4, height: 4, data: new Uint8Array(10) }, { levels: 2 })
    ).toThrow();
  });
});
