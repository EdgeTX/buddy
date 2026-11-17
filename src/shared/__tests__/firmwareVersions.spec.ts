import { describe, it, expect } from "vitest";
import { compareFirmwareReleases } from "shared/firmwareVersions";
import { exampleReleasesList } from "test-utils/data";

describe("compareFirmwareReleases", () => {
  it("sorts an interleaved list into descending semver order", () => {
    const releases = [
      { id: "v2.12.0" },
      { id: "v2.11.6" },
      { id: "v2.12.1" },
      { id: "v2.11.5" },
      { id: "v2.12.2" },
    ];

    expect(releases.sort(compareFirmwareReleases).map((r) => r.id)).toEqual([
      "v2.12.2",
      "v2.12.1",
      "v2.12.0",
      "v2.11.6",
      "v2.11.5",
    ]);
  });

  it("always sorts non-semver ids like 'nightly' first", () => {
    const releases = [{ id: "v2.12.2" }, { id: "nightly" }, { id: "v2.12.0" }];

    expect(releases.sort(compareFirmwareReleases).map((r) => r.id)).toEqual([
      "nightly",
      "v2.12.2",
      "v2.12.0",
    ]);
  });

  it("sorts prereleases below their corresponding final release", () => {
    const releases = [
      { id: "v2.5.0-rc1" },
      { id: "v2.5.0" },
      { id: "v2.5.0-rc3" },
      { id: "v2.5.0-rc2" },
    ];

    expect(releases.sort(compareFirmwareReleases).map((r) => r.id)).toEqual([
      "v2.5.0",
      "v2.5.0-rc3",
      "v2.5.0-rc2",
      "v2.5.0-rc1",
    ]);
  });

  it("reproduces the canonical order of the example releases mock data", () => {
    const shuffled = [...exampleReleasesList].reverse();

    expect(shuffled.sort(compareFirmwareReleases).map((r) => r.id)).toEqual(
      exampleReleasesList.map((r) => r.id)
    );
  });

  it("does not throw on empty, single-element, or already-sorted arrays", () => {
    expect([].sort(compareFirmwareReleases)).toEqual([]);
    expect([{ id: "v1.0.0" }].sort(compareFirmwareReleases)).toEqual([
      { id: "v1.0.0" },
    ]);
    expect(
      [{ id: "v2.0.0" }, { id: "v1.0.0" }]
        .sort(compareFirmwareReleases)
        .map((r) => r.id)
    ).toEqual(["v2.0.0", "v1.0.0"]);
  });
});
