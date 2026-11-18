import { formatElapsed } from "renderer/components/flashing/FlashBuildStatus";

describe("formatElapsed", () => {
  it("formats seconds as mm:ss", () => {
    expect(formatElapsed(0)).toBe("00:00");
    expect(formatElapsed(5)).toBe("00:05");
    expect(formatElapsed(65)).toBe("01:05");
    expect(formatElapsed(59 * 60 + 59)).toBe("59:59");
  });

  it("keeps counting minutes past an hour", () => {
    expect(formatElapsed(61 * 60 + 2)).toBe("61:02");
  });

  it("clamps negative values (clock skew) to zero", () => {
    expect(formatElapsed(-3)).toBe("00:00");
  });
});
