import * as uuid from "uuid";
import { GraphQLError } from "graphql";
import config from "shared/config";
import { arrayFromAsync, findAsync } from "shared/tools";
import { isArrayOf, isNotUndefined, isString } from "type-guards";
import semver from "semver";
import { createBuilder } from "shared/backend/utils/builder";
import type { TypeOf } from "shared/backend/types";

const builder = createBuilder();
// TODO: Move SD card assets to own module

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

const GithubReleaseArtifact = builder.simpleObject("GithubReleaseArtifact", {
  fields: (t) => ({
    id: t.id(),
    name: t.string(),
  }),
});

const EdgeTxSdcardPackRelease = builder.simpleObject(
  "EdgeTxSdcardPackRelease",
  {
    fields: (t) => ({
      id: t.id(),
      name: t.string(),
      isPrerelease: t.boolean(),
      artifacts: t.field({
        type: [GithubReleaseArtifact],
      }),
    }),
  }
);

const EdgeTxSoundsRelease = builder.simpleObject("EdgeTxSoundsRelease", {
  fields: (t) => ({
    id: t.id(),
    name: t.string(),
    latestMinorVersion: t.string(),
    artifacts: t.field({
      type: [GithubReleaseArtifact],
    }),
  }),
});

const SdcardWriteFileStatus = builder.simpleObject("SdcardWriteFileStatus", {
  fields: (t) => ({
    name: t.string(),
    startTime: t.string(),
    completedTime: t.string({ nullable: true }),
  }),
});
export type SdcardWriteFileStatusType = TypeOf<typeof SdcardWriteFileStatus>;

const AbstractSdcardWriteJobStage = builder.simpleInterface(
  "AbstractSdcardWriteJobStage",
  {
    fields: (t) => ({
      progress: t.float(),
      started: t.boolean(),
      completed: t.boolean(),
      error: t.string({ nullable: true }),
    }),
  }
);

const SdcardWriteJobStage = builder.simpleObject("SdcardWriteJobStage", {
  interfaces: [AbstractSdcardWriteJobStage],
});

const SdcardWriteJobWriteStage = builder.simpleObject(
  "SdcardWriteJobWriteStage",
  {
    fields: (t) => ({
      writes: t.field({
        type: [SdcardWriteFileStatus],
      }),
    }),
    interfaces: [AbstractSdcardWriteJobStage],
  }
);

const SdcardWriteJobStages = builder.simpleObject("SdcardWriteJobStages", {
  fields: (t) => ({
    erase: t.field({
      nullable: true,
      type: SdcardWriteJobStage,
    }),
    download: t.field({
      type: SdcardWriteJobStage,
    }),
    write: t.field({
      type: SdcardWriteJobWriteStage,
    }),
  }),
});
export type SdcardWriteJobStagesType = TypeOf<typeof SdcardWriteJobStages>;

const SdcardWriteJob = builder.simpleObject("SdcardWriteJob", {
  fields: (t) => ({
    id: t.id(),
    cancelled: t.boolean(),
    stages: t.field({
      type: SdcardWriteJobStages,
    }),
  }),
});
export type SdcardWriteJobType = TypeOf<typeof SdcardWriteJob>;

const SdcardDirectory = builder.simpleObject("SdcardDirectory", {
  fields: (t) => ({
    id: t.id(),
    name: t.string(),
  }),
});

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

builder.queryType({
  fields: (t) => ({
    edgeTxSdcardPackReleases: t.field({
      type: [EdgeTxSdcardPackRelease],
      resolve: async (_, __, { github }) => {
        const releases = (
          await github("GET /repos/{owner}/{repo}/releases", {
            owner: config.github.organization,
            repo: config.github.repos.sdcard,
          })
        ).data;

        return releases.map((release) => ({
          id: release.tag_name,
          name: release.name ?? release.tag_name,
          isPrerelease: release.prerelease,
          artifacts: release.assets.map((asset) => ({
            ...asset,
            id: asset.id.toString(),
          })),
        }));
      },
    }),
    edgeTxSdcardPackRelease: t.field({
      type: EdgeTxSdcardPackRelease,
      nullable: true,
      args: {
        id: t.arg.id({ required: true }),
      },
      resolve: async (_, { id }, { github }) => {
        const release = (
          await github("GET /repos/{owner}/{repo}/releases/tags/{tag}", {
            owner: config.github.organization,
            repo: config.github.repos.sdcard,
            tag: id.toString(),
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
    }),
    edgeTxSoundsReleases: t.field({
      type: [EdgeTxSoundsRelease],
      resolve: async (_, __, { github }) => {
        const releases = (
          await github("GET /repos/{owner}/{repo}/releases", {
            owner: config.github.organization,
            repo: config.github.repos.sounds,
          })
        ).data;

        return releases.map((release) => ({
          id: release.tag_name,
          name: release.name ?? release.tag_name,
          latestMinorVersion:
            findBestReleaseForPack(
              release.tag_name,
              release.prerelease,
              releases
            )?.tag_name ?? release.tag_name,
          artifacts: release.assets.map((asset) => ({
            ...asset,
            id: asset.id.toString(),
          })),
        }));
      },
    }),
    edgeTxSoundsRelease: t.field({
      type: EdgeTxSoundsRelease,
      nullable: true,
      args: {
        forPack: t.arg.id(),
        id: t.arg.id(),
        isPrerelease: t.arg.boolean({ required: true }),
      },
      resolve: async (_, { forPack, id, isPrerelease }, { github }) => {
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
          id?.toString() ?? forPack!.toString(),
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
          name: release.name ?? release.tag_name,
          latestMinorVersion: latestMinorRelease?.tag_name ?? "",
          artifacts: release.assets.map((asset) => ({
            ...asset,
            id: asset.id.toString(),
          })),
        };
      },
    }),
    sdcardDirectory: t.field({
      type: SdcardDirectory,
      nullable: true,
      args: {
        id: t.arg.id({ required: true }),
      },
      resolve: async (_, { id }) => {
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
              pack: { version: null, target: null },
              sounds: {
                version: null,
                ids: [],
              },
              themes: [],
            }
          : null;
      },
    }),
    sdcardWriteJobStatus: t.field({
      type: SdcardWriteJob,
      nullable: true,
      args: {
        jobId: t.arg.id({ required: true }),
      },
      resolve: (_, { jobId }, { sdcardJobs }) =>
        sdcardJobs.getSdcardJob(jobId.toString()) ?? null,
    }),
  }),
});

builder.subscriptionType({
  fields: (t) => ({
    sdcardWriteJobUpdates: t.field({
      type: SdcardWriteJob,
      args: {
        jobId: t.arg.id({ required: true }),
      },
      subscribe: (_, { jobId }, { sdcardJobs }) => ({
        [Symbol.asyncIterator]() {
          return sdcardJobs.jobUpdates.asyncIterator<SdcardWriteJobType>(
            jobId.toString()
          );
        },
      }),
      resolve: (value: SdcardWriteJobType) => value,
    }),
  }),
});

builder.mutationType({
  fields: (t) => ({
    cancelSdcardWriteJob: t.boolean({
      nullable: true,
      args: {
        jobId: t.arg.id({ required: true }),
      },
      resolve: (_, { jobId }, { sdcardJobs }) => {
        const job = sdcardJobs.getSdcardJob(jobId.toString());
        if (!job) {
          throw new GraphQLError("Job doesnt exist");
        }

        if (job.cancelled) {
          throw new GraphQLError("Job already cancelled");
        }
        sdcardJobs.cancelSdcardJob(jobId.toString());

        return null;
      },
    }),
    pickSdcardDirectory: t.field({
      type: SdcardDirectory,
      nullable: true,
      resolve: async (_, __, { fileSystem }) => {
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
    }),
    createSdcardWriteJob: t.field({
      type: SdcardWriteJob,
      args: {
        directoryId: t.arg.id({ required: true }),
        pack: t.arg({
          type: builder.inputType("SdcardPackInput", {
            fields: (t_) => ({
              target: t_.id({ required: true }),
              version: t_.id({ required: true }),
            }),
          }),
        }),
        sounds: t.arg({
          type: builder.inputType("SdcardSoundsInput", {
            fields: (t_) => ({
              ids: t_.idList({ required: true }),
              version: t_.string({ required: true }),
            }),
          }),
        }),
        clean: t.arg.boolean(),
      },
      resolve: async (_, { directoryId, pack, clean, sounds }, context) => {
        const directory = directories.find((d) => d.id === directoryId);

        if (!directory) {
          throw new GraphQLError("Folder id doesnt exist");
        }

        const targets = pack
          ? await context.sdcardAssets.fetchTargetsManifest(
              pack.version.toString()
            )
          : [];

        const requiredPackName = pack
          ? targets.find(({ id }) => id === pack.target)?.asset
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
                          asset.name.startsWith(
                            `edgetx-sdcard-sounds-${soundId}`
                          )
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
                  tag: pack.version.toString(),
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
          job.id.toString(),
          {
            directoryHandle: directory.handle,
            assetUrls,
            clean: cleanRequirements,
            writeMeta: {
              sounds: sounds ? { version: sounds.version } : undefined,
              pack: pack
                ? {
                    version: pack.version.toString(),
                    target: pack.target.toString(),
                  }
                : undefined,
            },
          },
          context
        );

        return job;
      },
    }),
  }),
});

builder.objectFields(EdgeTxSdcardPackRelease, (t) => ({
  targets: t.field({
    type: [
      builder.simpleObject("SdcardTarget", {
        fields: (t_) => ({
          id: t_.id(),
          name: t_.string(),
        }),
      }),
    ],
    resolve: async ({ artifacts, id }, _, { sdcardAssets }) => {
      const targets = await sdcardAssets.fetchTargetsManifest(id.toString());

      return artifacts.flatMap((asset) =>
        targets.filter((radio) => radio.asset === asset.name)
      );
    },
  }),
}));

builder.objectFields(EdgeTxSoundsRelease, (t) => ({
  sounds: t.idList({
    resolve: ({ artifacts }) =>
      artifacts
        .filter((artifact) => artifact.name.includes("edgetx-sdcard-sounds-"))
        .map(
          (artifact) =>
            // We have just filtered for this, so should be ok
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            artifact.name.split("edgetx-sdcard-sounds-")[1]!.split("-")[0]!
        )
        .map((isoName) => SOUND_NAMES_TO_ISO[isoName] ?? isoName),
  }),
}));

builder.objectFields(SdcardDirectory, (t) => ({
  isValid: t.boolean({
    resolve: async ({ id }) => {
      const handle = getDirectoryHandle(id.toString());
      return !!(await findAsync(handle.keys(), (entry) =>
        EXPECTED_ROOT_ENTRIES.includes(entry)
      ));
    },
  }),
  themes: t.stringList({
    resolve: async ({ id }) => {
      const handle = getDirectoryHandle(id.toString());
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
  }),
  sounds: t.field({
    type: builder.simpleObject("SdcardSounds", {
      fields: (t_) => ({
        ids: t_.stringList(),
        version: t_.string({ nullable: true }),
      }),
    }),
    resolve: async ({ id }) => {
      const handle = getDirectoryHandle(id.toString());
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
  }),
  pack: t.field({
    type: builder.simpleObject("SdcardPack", {
      fields: (t_) => ({
        version: t_.string({ nullable: true }),
        target: t_.string({ nullable: true }),
      }),
    }),
    resolve: async ({ id }) => {
      const handle = getDirectoryHandle(id.toString());
      return {
        version:
          (await readVersionFromFile(handle, "edgetx.sdcard.version")) ?? null,
        target:
          (await readVersionFromFile(handle, "edgetx.sdcard.target")) ?? null,
      };
    },
  }),
}));

const maxDirectoriesHandles = 5;
const directories: {
  handle: FileSystemDirectoryHandle;
  id: string;
}[] = [];

export default {
  schema: builder.toSchema({}),
};
