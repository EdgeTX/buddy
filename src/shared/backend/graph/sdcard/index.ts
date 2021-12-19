import gql from "graphql-tag";
import * as uuid from "uuid";
import { GraphQLError } from "graphql";
import { Resolvers, SdcardWriteJob } from "shared/backend/graph/__generated__";
import config from "shared/config";
import { arrayFromAsync, findAsync } from "shared/tools";
import { isArrayOf, isNotUndefined, isString } from "type-guards";
import semver from "semver";
import ISO6391 from "iso-639-1";

// TODO: Move SD card assets to own module

const targetsToAssets = [
  { name: "Flysky NV14", asset: "nv14.zip", id: "nv14" },
  { name: "Jumper T16", asset: "horus.zip", id: "t16" },
  { name: "Jumper T18", asset: "horus.zip", id: "t18" },
  { name: "Jumper T-Lite", asset: "taranis-x7.zip", id: "tlite" },
  { name: "Jumper T12", asset: "taranis-x7.zip", id: "t12" },
  { name: "Jumper T8", asset: "taranis-x7.zip", id: "t8" },
  { name: "Frsky Horus X10", asset: "horus.zip", id: "x10" },
  { name: "Frsky Horus X10 Access", asset: "horus.zip", id: "x10-access" },
  { name: "Frsky Horus X12s", asset: "horus.zip", id: "x12s" },
  { name: "Frsky QX7", asset: "taranis-x7.zip", id: "x7" },
  { name: "Frsky QX7 Access", asset: "taranis-x7.zip", id: "x7-access" },
  { name: "Frsky X9D", asset: "taranis-x9.zip", id: "x9d" },
  { name: "Frsky X9D Plus", asset: "taranis-x9.zip", id: "x9dp" },
  { name: "Frsky X9D Plus 2019", asset: "taranis-x9.zip", id: "x9dp2019" },
  { name: "Frsky X-Lite", asset: "taranis-x7.zip", id: "xlite" },
  { name: "Frsky X-Lite S", asset: "taranis-x7.zip", id: "xlites" },
  { name: "Frsky X9 Lite", asset: "taranis-x7.zip", id: "x9lite" },
  { name: "Frsky X9 Lite S", asset: "taranis-x7.zip", id: "x9lites" },
  { name: "Radiomaster TX12", asset: "taranis-x7.zip", id: "tx12" },
  { name: "Radiomaster TX16s", asset: "horus.zip", id: "tx16s" },
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
  "EEPROM",
];

const SOUND_NAMES_TO_ISO: Record<string, string> = {
  cn: "zh",
  cz: "cs",
};

const typeDefs = gql`
  type Query {
    edgeTxSdcardPackReleases: [EdgeTxSdcardPackRelease!]!
    edgeTxSdcardPackRelease(id: ID!): EdgeTxSdcardPackRelease
    edgeTxSoundsReleases: [EdgeTxSoundsRelease!]!
    edgeTxSoundsRelease(
      forPack: ID
      id: ID
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
      pack: SdcardPackInput
      sounds: SdcardSoundsInput
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
    pack: SdcardPack!
    sounds: SdcardSounds!
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
    latestMinorVersion: String!
    sounds: [SdcardSoundsAsset!]!
    artifacts: [GithubReleaseArtifact!]!
  }

  type SdcardPack {
    target: String
    version: String
  }

  type SdcardSounds {
    ids: [String!]!
    version: String
  }

  input SdcardPackInput {
    target: ID!
    version: ID!
  }

  input SdcardSoundsInput {
    ids: [ID!]!
    version: String!
  }
`;

const getDirectoryHandle = (id: string): FileSystemDirectoryHandle => {
  const handle = directories.find((directory) => directory.id === id)?.handle;

  if (!handle) {
    throw new GraphQLError("Directory handle does not exist");
  }

  return handle;
};

const readVersionFromFile = async (
  directoryHandle: FileSystemDirectoryHandle,
  fileName: string
): Promise<string | undefined> => {
  const versionFile = await directoryHandle
    .getFileHandle(fileName)
    .then((h) => h.getFile())
    .catch(() => undefined);
  if (versionFile) {
    const contents = await versionFile.text();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return contents.split("\n")[0]!;
  }
  return undefined;
};

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
        latestMinorVersion:
          findBestReleaseForPack(release.tag_name, release.prerelease, releases)
            ?.tag_name ?? release.tag_name,
        artifacts: release.assets.map((asset) => ({
          ...asset,
          id: asset.id.toString(),
        })),
      }));
    },
    edgeTxSoundsRelease: async (
      _,
      { forPack, id, isPrerelease },
      { github }
    ) => {
      const releases = (
        await github("GET /repos/{owner}/{repo}/releases", {
          owner: config.github.organization,
          repo: config.github.repos.sounds,
        })
      ).data;

      if (!id && !forPack) {
        throw new GraphQLError("No queries given");
      }

      const latestMinorRelease = findBestReleaseForPack(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        id ?? forPack!,
        isPrerelease,
        releases
      );

      const release = id
        ? releases.find((r) => r.tag_name === id)
        : latestMinorRelease;

      if (!release) {
        return null;
      }

      return {
        id: release.tag_name,
        sounds: [],
        name: release.name ?? release.tag_name,
        latestMinorVersion: "",
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
        targetsToAssets.filter((radio) => radio.asset === asset.name)
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
            pack: { version: null, target: null },
            sounds: {
              version: null,
              ids: [],
            },
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
        pack: {
          version: null,
          target: null,
        },
        sounds: {
          ids: [],
          version: null,
        },
        themes: [],
      };
    },
    createSdcardWriteJob: async (
      _,
      { directoryId, pack, clean, sounds },
      context
    ) => {
      const directory = directories.find((d) => d.id === directoryId);

      if (!directory) {
        throw new GraphQLError("Folder id doesnt exist");
      }

      const requiredPackName = pack
        ? targetsToAssets.find(({ id }) => id === pack.target)?.asset
        : undefined;

      if (pack && !requiredPackName) {
        throw new GraphQLError("Target doesnt exist");
      }

      const assetUrls = (
        await Promise.all([
          sounds &&
            sounds.ids.length > 0 &&
            context
              .github("GET /repos/{owner}/{repo}/releases/tags/{tag}", {
                owner: config.github.organization,
                repo: config.github.repos.sounds,
                tag: sounds.version,
              })
              .then(({ data }) =>
                sounds.ids
                  .map(
                    (soundId) =>
                      data.assets.find((asset) =>
                        asset.name.startsWith(`edgetx-sdcard-sounds-${soundId}`)
                      )?.browser_download_url
                  )
                  .filter(isString)
              )
              .then((urls) => {
                if (urls.length === 0) {
                  throw new GraphQLError("Could not get sdcard sounds");
                }
                return urls;
              }),
          pack &&
            context
              .github("GET /repos/{owner}/{repo}/releases/tags/{tag}", {
                owner: config.github.organization,
                repo: config.github.repos.sdcard,
                tag: pack.version,
              })
              .then(
                ({ data }) =>
                  data.assets.find((asset) => asset.name === requiredPackName)
                    ?.browser_download_url
              )
              .then((url) => {
                if (!url) {
                  throw new GraphQLError("Could not get sdcard pack");
                }
                return [url];
              }),
        ])
      )
        .filter(isArrayOf(isString))
        .flat();

      const cleanRequirements = clean ?? (sounds ? ["SOUNDS"] : false);

      const job = context.sdcardJobs.createSdcardJob(
        cleanRequirements
          ? ["download", "erase", "write"]
          : ["download", "write"]
      );

      await context.sdcardJobs.startExecution(
        job.id,
        {
          directoryHandle: directory.handle,
          assetUrls,
          clean: cleanRequirements,
          writeMeta: {
            sounds: sounds ? { version: sounds.version } : undefined,
            pack: pack
              ? { version: pack.version, target: pack.target }
              : undefined,
          },
        },
        context
      );

      return job;
    },
  },
  EdgeTxSdcardPackRelease: {
    targets: ({ artifacts }) =>
      artifacts.flatMap((releaseArtifact) =>
        targetsToAssets.filter((radio) => radio.asset === releaseArtifact.name)
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
        .map((isoName) => {
          const iso = SOUND_NAMES_TO_ISO[isoName] ?? isoName;
          return {
            id: isoName,
            name: ISO6391.validate(iso)
              ? ISO6391.getNativeName(iso)
              : isoName.toUpperCase(),
          };
        }),
  },
  SdcardDirectory: {
    isValid: async ({ id }) => {
      const handle = getDirectoryHandle(id);
      return !!(await findAsync(handle.keys(), (entry) =>
        EXPECTED_ROOT_ENTRIES.includes(entry)
      ));
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
    sounds: async ({ id }) => {
      const handle = getDirectoryHandle(id);
      const soundsDirectoryHandle = await handle
        .getDirectoryHandle("SOUNDS")
        .catch(() => undefined);

      if (!soundsDirectoryHandle) {
        return {
          version: null,
          ids: [],
        };
      }

      return {
        version: await readVersionFromFile(
          soundsDirectoryHandle,
          "edgetx.sounds.version"
        ),
        ids: (await arrayFromAsync(soundsDirectoryHandle.values()))
          .filter(
            (file): file is FileSystemDirectoryHandle =>
              file.kind === "directory"
          )
          .map((folder) => folder.name),
      };
    },
    pack: async ({ id }) => {
      const handle = getDirectoryHandle(id);
      return {
        version:
          (await readVersionFromFile(handle, "edgetx.sdcard.version")) ?? null,
        target:
          (await readVersionFromFile(handle, "edgetx.sdcard.target")) ?? null,
      };
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
