import config from "shared/backend/config";
import { createBuilder } from "shared/backend/utils/builder";

const builder = createBuilder();

const Release = builder.simpleObject("Release", {
  fields: (t) => ({
    id: t.string(),
    name: t.string(),
    description: t.string(),
    excludeTargets: t.stringList(),
    sha: t.string(),
    isPrerelease: t.boolean(),
  }),
});

const Flags = builder.simpleObject("Flags", {
  fields: (t) => ({
    key: t.string(),
    value: t.stringList(),
  }),
});

// flags: Record<string, string[]>
const Tag = builder.simpleObject("Tag", {
  fields: (t) => ({
    flags: t.field({ type: Flags }),
  }),
});

const TargetFlag = builder.simpleObject("TargetFlag", {
  fields: (t) => ({
    values: t.stringList(),
  }),
});

const Target = builder.simpleObject("Target", {
  fields: (t) => ({
    description: t.string(),
    tags: t.stringList(),
  }),
});

const TargetFlags = builder.simpleObject("TargetFlags", {
  fields: (t) => ({
    key: t.string(),
    value: t.field({ type: TargetFlag }),
  }),
});

const Tags = builder.simpleObject("Tags", {
  fields: (t) => ({
    key: t.string(),
    value: t.field({ type: Tag }),
  }),
});

const Targets = builder.simpleObject("Targets", {
  fields: (t) => ({
    key: t.string(),
    value: t.field({ type: Target }),
  }),
});

// releases: Record<string, Release>;
// flags: Record<string, TargetFlag>;
// tags: Record<string, Tag>;
// targets: Record<string, Target>;
const CloudTargets = builder.simpleObject("CloudTargets", {
  fields: (t) => ({
    releases: t.field({ type: [Release] }),
    flags: t.field({ type: [TargetFlags] }),
    tags: t.field({ type: [Tags] }),
    targets: t.field({ type: [Targets] }),
  }),
});

builder.queryType({
  fields: (t) => ({
    cloudFirmwares: t.field({
      type: CloudTargets,
      resolve: async (_, __, { cloudbuild, github }) => {
        const targets = await cloudbuild.fetchTargets();
        const firmwaresReleases = new Set(Object.keys(targets.releases));
        const githubReleases = await github(
          "GET /repos/{owner}/{repo}/releases",
          {
            owner: config.github.organization,
            repo: config.github.repos.firmware,
          }
        );

        // product of github releases and firmwares releases
        const releases = githubReleases.data
          .filter((release) => firmwaresReleases.has(release.tag_name))
          .map((release) => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const cloudRelease = targets.releases[release.tag_name]!;
            return {
              id: release.tag_name,
              name: release.name ?? release.tag_name,
              description: release.body_text,
              isPrerelease: release.prerelease,
              sha: cloudRelease.sha,
              excludeTargets: cloudRelease.exclude_targets ?? [],
            };
          });

        return {
          releases,
        } as any;
      },
    }),
  }),
});

export default {
  schema: builder.toSchema({}),
};
