import semver from "semver";

/**
 * Compares two firmware releases by their id (git tag name, e.g. "v2.12.2")
 * for descending version order (latest first).
 *
 * Non-semver ids (e.g. "nightly", a rolling build) always sort first,
 * ahead of every numbered release.
 */
export const compareFirmwareReleases = <T extends { id: string }>(
  a: T,
  b: T
): number => {
  const aVersion = semver.valid(a.id);
  const bVersion = semver.valid(b.id);

  if (!aVersion && !bVersion) return 0;
  if (!aVersion) return -1;
  if (!bVersion) return 1;

  return semver.rcompare(aVersion, bVersion);
};
