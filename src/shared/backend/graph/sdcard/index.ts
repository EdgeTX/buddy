import gql from "graphql-tag";
import * as uuid from "uuid";
import { GraphQLError } from "graphql";
import { Resolvers, SdcardWriteJob } from "shared/backend/graph/__generated__";
import config from "shared/config";
import { arrayFromAsync, findAsync } from "shared/tools";
import { isNotUndefined } from "type-guards";
import semver from "semver";

// TODO: Move SD card assets to own module

const targetsToAssets = [
  { name: "FlySky Nirvana", asset: "nv14.zip" },
  { name: "Jumper T16", asset: "horus.zip" },
  { name: "Jumper T18", asset: "horus.zip" },
  { name: "Jumper T-Lite", asset: "taranis-x7.zip" },
  { name: "Jumper T12", asset: "taranis-x7.zip" },
  { name: "Jumper T8", asset: "taranis-x7.zip" },
  { name: "FrSky Horus X10", asset: "horus.zip" },
  { name: "FrSky Horus X12s", asset: "horus.zip" },
  { name: "FrSky QX7", asset: "taranis-x7.zip" },
  { name: "FrSky X9D", asset: "taranis-x9.zip" },
  { name: "FrSky X9D Plus", asset: "taranis-x9.zip" },
  { name: "FrSky X9D Plus 2019", asset: "taranis-x9.zip" },
  { name: "FrSky X-Lite", asset: "taranis-x7.zip" },
  { name: "FrSky X9 Lite", asset: "taranis-x7.zip" },
  { name: "Radiomaster TX12", asset: "taranis-x7.zip" },
  { name: "Radiomaster TX16s", asset: "horus.zip" },
];

const EXPECTED_ROOT_ENTRIES = [
  "FIRMWARE",
  "THEMES",
  "IMAGES",
  "RADIO",
  "SOUNDS",
  "edgetx.sdcard.version",
  "MODELS",
  "SCRIPTS",
  "SCREENSHOTS",
];

const typeDefs = gql`
  type Query {
    edgeTxSdcardPackReleases: [EdgeTxSdcardPackRelease!]!
    edgeTxSdcardPackRelease(id: ID!): EdgeTxSdcardPackRelease
    edgeTxSoundsReleases: [EdgeTxSoundsRelease!]!
    edgeTxSoundsRelease(
      forPack: ID!
      isPrerelease: Boolean!
    ): EdgeTxSoundsRelease
    sdcardTargets: [SdcardTarget!]!
    sdcardSounds: [SdcardSoundsAsset!]!
    sdcardDirectory(id: ID!): SdcardDirectory
    sdcardWriteJobStatus(jobId: ID!): SdcardWriteJob
  }

  type Mutation {
    pickSdcardDirectory: SdcardDirectory
    createSdcardWriteJob(
      directoryId: ID!
      target: ID!
      sounds: ID!
      clean: Boolean
    ): SdcardWriteJob!
    cancelSdcardWriteJob(jobId: ID!): Boolean
  }

  type Subscription {
    sdcardWriteJobUpdates(jobId: ID!): SdcardWriteJob!
  }

  type SdcardWriteJob {
    id: ID!
    cancelled: Boolean!
    stages: SdcardWriteJobStages!
  }

  type SdcardWriteJobStages {
    erase: SdcardWriteJobStage
    download: SdcardWriteJobStage
    write: SdcardWriteJobWriteStage!
  }

  type SdcardWriteJobStage {
    progress: Float!
    started: Boolean!
    completed: Boolean!
    error: String
  }

  type SdcardWriteJobWriteStage {
    progress: Float!
    writes: [SdcardWriteFileStatus!]!
    started: Boolean!
    completed: Boolean!
    error: String
  }

  type SdcardWriteFileStatus {
    name: String!
    startTime: String!
    completedTime: String
  }

  type SdcardDirectory {
    id: ID!
    name: String!
    isValid: Boolean!
    version: String
    target: String
    sounds: [String!]!
    themes: [String!]!
  }

  type SdcardTarget {
    id: ID!
    name: String!
  }

  type SdcardSoundsAsset {
    id: ID!
    name: String!
  }

  type GithubReleaseArtifact {
    id: ID!
    name: String!
  }

  type EdgeTxSdcardPackRelease {
    id: ID!
    name: String!
    isPrerelease: Boolean!
    targets: [SdcardTarget!]!
    artifacts: [GithubReleaseArtifact!]!
  }

  type EdgeTxSoundsRelease {
    id: ID!
    name: String!
    sounds: [SdcardSoundsAsset!]!
    artifacts: [GithubReleaseArtifact!]!
  }
`;

const getDirectoryHandle = (id: string): FileSystemDirectoryHandle => {
  const handle = directories.find((directory) => directory.id === id)?.handle;

  if (!handle) {
    throw new GraphQLError("Directory handle does not exist");
  }

  return handle;
};

const nameToId = (name: string): string =>
  name.split(" ").join("-").toLowerCase();

/**
 * Try to find the sounds which are the most up to date
 * for the same sdcard minor version
 */
const findBestReleaseForPack = <
  T extends { prerelease: boolean; tag_name: string }
>(
  packVersion: string,
  isPrerelease: boolean,
  releases: T[]
): T | undefined =>
  releases.find(
    (r) =>
      (semver.valid(r.tag_name) &&
        semver.valid(packVersion) &&
        semver.major(r.tag_name) === semver.major(packVersion) &&
        semver.minor(r.tag_name) === semver.minor(packVersion) &&
        r.prerelease === isPrerelease) ||
      r.tag_name === packVersion
  );

const resolvers: Resolvers = {
  Query: {
    edgeTxSdcardPackReleases: async (_, __, { github }) => {
      const releases = (
        await github("GET /repos/{owner}/{repo}/releases", {
          owner: config.github.organization,
          repo: config.github.repos.sdcard,
        })
      ).data;

      return releases.map((release) => ({
        id: release.tag_name,
        targets: [],
        name: release.name ?? release.tag_name,
        isPrerelease: release.prerelease,
        artifacts: release.assets.map((asset) => ({
          ...asset,
          id: asset.id.toString(),
        })),
      }));
    },
    edgeTxSdcardPackRelease: async (_, { id }, { github }) => {
      const release = (
        await github("GET /repos/{owner}/{repo}/releases/tags/{tag}", {
          owner: config.github.organization,
          repo: config.github.repos.sdcard,
          tag: id,
        }).catch(() => ({ data: undefined }))
      ).data;

      if (!release) {
        return null;
      }

      return {
        id: release.tag_name,
        targets: [],
        name: release.name ?? release.tag_name,
        isPrerelease: release.prerelease,
        artifacts: release.assets.map((asset) => ({
          ...asset,
          id: asset.id.toString(),
        })),
      };
    },
    edgeTxSoundsReleases: async (_, __, { github }) => {
      const releases = (
        await github("GET /repos/{owner}/{repo}/releases", {
          owner: config.github.organization,
          repo: config.github.repos.sounds,
        })
      ).data;

      return releases.map((release) => ({
        id: release.tag_name,
        sounds: [],
        name: release.name ?? release.tag_name,
        artifacts: release.assets.map((asset) => ({
          ...asset,
          id: asset.id.toString(),
        })),
      }));
    },
    edgeTxSoundsRelease: async (_, { forPack, isPrerelease }, { github }) => {
      const releases = (
        await github("GET /repos/{owner}/{repo}/releases", {
          owner: config.github.organization,
          repo: config.github.repos.sounds,
        })
      ).data;

      const release = findBestReleaseForPack(forPack, isPrerelease, releases);

      if (!release) {
        return null;
      }

      return {
        id: release.tag_name,
        sounds: [],
        name: release.name ?? release.tag_name,
        artifacts: release.assets.map((asset) => ({
          ...asset,
          id: asset.id.toString(),
        })),
      };
    },
    sdcardTargets: async (_, __, { github }) => {
      const release = (
        await github("GET /repos/{owner}/{repo}/releases/latest", {
          owner: config.github.organization,
          repo: config.github.repos.sdcard,
        })
      ).data;

      const sdcardAssets = release.assets;
      return sdcardAssets.flatMap((asset) =>
        targetsToAssets
          .filter((radio) => radio.asset === asset.name)
          .map((radio) => ({
            ...radio,
            id: nameToId(radio.name),
          }))
      );
    },
    sdcardSounds: async (_, __, { github }) => {
      const soundsRelease = (
        await github("GET /repos/{owner}/{repo}/releases/latest", {
          owner: config.github.organization,
          repo: config.github.repos.sounds,
        })
      ).data;

      return soundsRelease.assets
        .filter((asset) => asset.name.includes("edgetx-sdcard-sounds-"))
        .map(
          (asset) =>
            // We have just filtered for this, so should be ok
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            asset.name.split("edgetx-sdcard-sounds-")[1]!.split("-")[0]!
        )
        .map((name) => ({
          id: name,
          name: name.toUpperCase(),
        }));
    },
    sdcardDirectory: async (_, { id }) => {
      const handle = directories.find(
        (directory) => directory.id === id
      )?.handle;

      // Make sure the directory still exists
      if (handle) {
        try {
          await arrayFromAsync(handle.keys());
        } catch {
          return null;
        }
      }

      return handle
        ? {
            id,
            name: handle.name,
            isValid: false,
            version: null,
            target: null,
            sounds: [],
            themes: [],
          }
        : null;
    },
    sdcardWriteJobStatus: (_, { jobId }, { sdcardJobs }) =>
      sdcardJobs.getSdcardJob(jobId) ?? null,
  },
  Subscription: {
    sdcardWriteJobUpdates: {
      subscribe: (_, { jobId }, { sdcardJobs }) => ({
        [Symbol.asyncIterator]() {
          return sdcardJobs.jobUpdates.asyncIterator<SdcardWriteJob>(jobId);
        },
      }),
      resolve: (value: SdcardWriteJob) => value,
    },
  },
  Mutation: {
    cancelSdcardWriteJob: (_, { jobId }, { sdcardJobs }) => {
      const job = sdcardJobs.getSdcardJob(jobId);
      if (!job) {
        throw new GraphQLError("Job doesnt exist");
      }

      if (job.cancelled) {
        throw new GraphQLError("Job already cancelled");
      }
      sdcardJobs.cancelSdcardJob(jobId);

      return null;
    },
    pickSdcardDirectory: async (_, __, { fileSystem }) => {
      const handle = await fileSystem
        .requestWritableDirectory({
          id: "edgetx-sdcard",
        })
        .catch(() => undefined);

      if (!handle) {
        return null;
      }

      const id = uuid.v4();
      directories.push({
        id,
        handle,
      });

      if (directories.length > maxDirectoriesHandles) {
        directories.shift();
      }

      return {
        id,
        name: handle.name,
        isValid: false,
        version: null,
        target: null,
        sounds: [],
        themes: [],
      };
    },
    createSdcardWriteJob: async (
      _,
      { directoryId, target, clean, sounds },
      context
    ) => {
      const directory = directories.find((d) => d.id === directoryId);

      if (!directory) {
        throw new GraphQLError("Folder id doesnt exist");
      }

      const requiredAssetName = targetsToAssets.find(
        ({ name }) => nameToId(name) === target
      )?.asset;

      if (!requiredAssetName) {
        throw new GraphQLError("Target doesnt exist");
      }

      const [sdcardAssetUrl, soundsAssetUrl] = await Promise.all([
        context
          .github("GET /repos/{owner}/{repo}/releases/latest", {
            owner: config.github.organization,
            repo: config.github.repos.sdcard,
          })
          .then(
            ({ data }) =>
              data.assets.find((asset) => asset.name === requiredAssetName)
                ?.browser_download_url
          ),
        context
          .github("GET /repos/{owner}/{repo}/releases/latest", {
            owner: config.github.organization,
            repo: config.github.repos.sounds,
          })
          .then(
            ({ data }) =>
              data.assets.find((asset) =>
                asset.name.startsWith(`edgetx-sdcard-sounds-${sounds}`)
              )?.browser_download_url
          ),
      ]);

      if (!sdcardAssetUrl) {
        throw new GraphQLError("Couldn't find sdcard assets url");
      }

      if (!soundsAssetUrl) {
        throw new GraphQLError("Couldn't find sound assets url");
      }

      const job = context.sdcardJobs.createSdcardJob(
        clean ? ["download", "erase", "write"] : ["download", "write"]
      );

      await context.sdcardJobs.startExecution(
        job.id,
        {
          directoryHandle: directory.handle,
          assetUrls: [soundsAssetUrl, sdcardAssetUrl],
          clean: clean ?? false,
        },
        context
      );

      return job;
    },
  },
  EdgeTxSdcardPackRelease: {
    targets: ({ artifacts }) =>
      artifacts.flatMap((releaseArtifact) =>
        targetsToAssets
          .filter((radio) => radio.asset === releaseArtifact.name)
          .map((radio) => ({
            ...radio,
            id: nameToId(radio.name),
          }))
      ),
  },
  EdgeTxSoundsRelease: {
    sounds: ({ artifacts }) =>
      artifacts
        .filter((artifact) => artifact.name.includes("edgetx-sdcard-sounds-"))
        .map(
          (artifact) =>
            // We have just filtered for this, so should be ok
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            artifact.name.split("edgetx-sdcard-sounds-")[1]!.split("-")[0]!
        )
        .map((name) => ({
          id: name,
          name: name.toUpperCase(),
        })),
  },
  SdcardDirectory: {
    isValid: async ({ id }) => {
      const handle = getDirectoryHandle(id);
      return !!(await findAsync(handle.keys(), (entry) =>
        EXPECTED_ROOT_ENTRIES.includes(entry)
      ));
    },
    sounds: async ({ id }) => {
      const handle = getDirectoryHandle(id);
      const soundsDirectoryHandle = await handle
        .getDirectoryHandle("SOUNDS")
        .catch(() => undefined);

      if (soundsDirectoryHandle) {
        return (await arrayFromAsync(soundsDirectoryHandle.values()))
          .filter(
            (file): file is FileSystemDirectoryHandle =>
              file.kind === "directory"
          )
          .map((folder) => folder.name);
      }
      return [];
    },

    themes: async ({ id }) => {
      const handle = getDirectoryHandle(id);
      const themesDirectoryHandle = await handle
        .getDirectoryHandle("THEMES", { create: true })
        .catch(() => undefined);

      if (themesDirectoryHandle) {
        const themeFiles = await arrayFromAsync(themesDirectoryHandle.values());
        const validThemeDirectories = (
          await Promise.all(
            themeFiles
              .filter(
                (file): file is FileSystemDirectoryHandle =>
                  file.kind === "directory"
              )
              .map((folder) =>
                folder
                  .getFileHandle("theme.yml")
                  .then(() => folder.name)
                  .catch(() => undefined)
              )
          )
        ).filter(isNotUndefined);

        if (validThemeDirectories.length > 0) {
          return validThemeDirectories;
        }

        const themeFileConfigs = await Promise.all(
          themeFiles
            .filter(
              (file): file is FileSystemFileHandle =>
                file.kind === "file" && file.name.endsWith(".yml")
            )
            .map((file) => file.name.replace(".yml", ""))
        );

        return themeFileConfigs;
      }
      return [];
    },
    version: async ({ id }) => {
      const handle = getDirectoryHandle(id);
      const versionFile = await handle
        .getFileHandle("edgetx.sdcard.version")
        .then((h) => h.getFile())
        .catch(() => undefined);
      if (versionFile) {
        const contents = await versionFile.text();
        if (contents.startsWith("v")) {
          return contents;
        }
      }

      return null;
    },
    target: async ({ id }) => {
      const handle = getDirectoryHandle(id);
      const versionFile = await handle
        .getFileHandle("edgetx.sdcard.target")
        .then((h) => h.getFile())
        .catch(() => undefined);
      if (versionFile) {
        return versionFile.text();
      }

      return null;
    },
  },
};

const maxDirectoriesHandles = 5;
const directories: {
  handle: FileSystemDirectoryHandle;
  id: string;
}[] = [];

export default {
  typeDefs,
  resolvers,
};
