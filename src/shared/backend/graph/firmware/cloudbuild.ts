import config from "shared/backend/config";
import { createBuilder } from "shared/backend/utils/builder";

const builder = createBuilder();

// Targets data

const Release = builder.simpleObject("Release", {
  fields: (t) => ({
    id: t.string(),
    name: t.string(),
    description: t.string({ nullable: true }),
    timestamp: t.string(),
    excludeTargets: t.stringList(),
    sha: t.string(),
    isPrerelease: t.boolean(),
  }),
});

const Flag = builder.simpleObject("Flag", {
  fields: (t) => ({
    id: t.string(),
    values: t.stringList(),
  }),
});

const Target = builder.simpleObject("Target", {
  fields: (t) => ({
    id: t.string(),
    name: t.string(),
    tags: t.stringList(),
  }),
});

const TagFlag = builder.simpleObject("TagFlag", {
  fields: (t) => ({
    id: t.string(),
    values: t.stringList(),
  }),
});

const Tag = builder.simpleObject("Tag", {
  fields: (t) => ({
    id: t.string(),
    tagFlags: t.field({ type: [TagFlag] }),
  }),
});

const CloudTargets = builder.simpleObject("CloudTargets", {
  fields: (t) => ({
    releases: t.field({ type: [Release] }),
    targets: t.field({ type: [Target] }),
    flags: t.field({ type: [Flag] }),
    tags: t.field({ type: [Tag] }),
  }),
});

// Job status

const CloudFirmwareStatus = builder.simpleObject("CloudFirmwareStatus", {
  fields: (t) => ({
    status: t.string(),
    downloadUrl: t.string({ nullable: true }),
  }),
});

const CloudFirmwareParams = builder.inputType("CloudFirmwareParams", {
  fields: (t) => ({
    release: t.string({ required: true }),
    target: t.string({ required: true }),
    flags: t.field({
      type: [
        builder.inputType("SelectedFlag", {
          fields: (t__) => ({
            name: t__.string({ required: true }),
            value: t__.string({ required: true }),
          }),
        }),
      ],
      required: true,
    }),
  }),
});

builder.queryType({
  fields: (t) => ({
    cloudTargets: t.field({
      type: CloudTargets,
      resolve: async (_, __, { cloudbuild, github }) => {
        const [cloudTargets, githubReleases] = await Promise.all([
          cloudbuild.fetchTargets(),
          github("GET /repos/{owner}/{repo}/releases", {
            owner: config.github.organization,
            repo: config.github.repos.firmware,
          }),
        ]);
        const firmwaresReleases = new Set(Object.keys(cloudTargets.releases));

        // product of github releases and firmwares releases
        const releases = githubReleases.data
          .filter((release) => firmwaresReleases.has(release.tag_name))
          .map((release) => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const cloudRelease = cloudTargets.releases[release.tag_name]!;
            return {
              id: release.tag_name,
              name: release.name ?? release.tag_name,
              description: release.body_text,
              isPrerelease: release.prerelease,
              timestamp: release.published_at ?? release.created_at,
              sha: cloudRelease.sha,
              excludeTargets: cloudRelease.exclude_targets ?? [],
            };
          });

        const targets = Object.entries(cloudTargets.targets).map(
          ([id, target]) => ({
            id,
            name: target.description,
            tags: target.tags ?? [],
          })
        );

        const flags = Object.entries(cloudTargets.flags).map(([id, flag]) => ({
          id,
          values: flag.values,
        }));

        const tags = Object.entries(cloudTargets.tags).map(([id, tag]) => {
          const tagFlags = Object.entries(tag.flags).map(
            ([flagId, tagFlag]) => ({ id: flagId, values: tagFlag.values })
          );
          return { id, tagFlags };
        });

        return {
          releases,
          targets,
          flags,
          tags,
        };
      },
    }),
    cloudFirmwareStatus: t.field({
      type: CloudFirmwareStatus,
      args: {
        params: t.arg({ type: CloudFirmwareParams, required: true }),
      },
      resolve: async (_, { params }, { cloudbuild }) => {
        const jobStatus = await cloudbuild.queryJobStatus(params);
        return {
          status: jobStatus.status,
          downloadUrl: jobStatus.artifacts[0].download_url,
        };
      },
    }),
  }),
});

builder.mutationType({
  fields: (t) => ({
    createCloudFirmware: t.field({
      type: CloudFirmwareStatus,
      args: {
        params: t.arg({ type: CloudFirmwareParams, required: true }),
      },
      resolve: async (_, { params }, { cloudbuild }) => {
        const jobStatus = await cloudbuild.createJob(params);
        return {
          status: jobStatus.status,
          downloadUrl: jobStatus.artifacts[0].download_url,
        };
      },
    }),
  }),
});

export default {
  schema: builder.toSchema({}),
};
