import * as uuid from "uuid";
import { GraphQLError } from "graphql";
import config from "shared/backend/config";
import { arrayFromAsync, findAsync } from "shared/tools";
import { isArrayOf, isNotUndefined, isString } from "type-guards";
import semver from "semver";
import { createBuilder } from "shared/backend/utils/builder";
import type { TypeOf } from "shared/backend/types";
import type { Context } from "shared/backend/context";
import {
  startBackupExecution,
  buildBackupPlan,
  exportBackupToZip,
  startRestoreExecution,
  buildRestorePlan,
} from "shared/backend/services/sdcardJobs";
import * as yaml from "js-yaml";
import GraphQLJSON from "graphql-type-json";

const builder = createBuilder();
builder.addScalarType("JSON", GraphQLJSON, {});

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

const ISO_TO_SOUND_NAMES: Record<string, string> = {
  zh: "cn",
  cs: "cz",
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

export const SdcardAssetsDirectory = builder.simpleObject(
  "SdcardAssetsDirectory",
  {
    fields: (t) => ({
      id: t.id(),
      name: t.string(),
    }),
  }
);

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

const SdcardPathsInput = builder.inputType("SdcardPathsInput", {
  fields: (t) => ({
    paths: t.stringList({
      required: true,
      description:
        "List of file or directory paths (relative to SD-card root) to include in the backup.",
    }),
  }),
});

const ConflictEntry = builder.simpleObject("ConflictEntry", {
  fields: (t) => ({
    path: t.string(),
    existingSize: t.int(),
    incomingSize: t.int(),
    // maybe also checksums or arrayBuffers for diff…
  }),
});
const BackupPlan = builder.simpleObject("BackupPlan", {
  fields: (t) => ({
    toCopy: t.stringList(),
    identical: t.stringList(),
    conflicts: t.field({ type: [ConflictEntry] }),
  }),
});

export const SdcardThemeEntry = builder.simpleObject("SdcardThemeEntry", {
  fields: (t) => ({
    name: t.string(),
    yaml: t.string(),
    logoUrl: t.string({ nullable: true }),
    backgroundUrl: t.string({ nullable: true }),
  }),
});

const BackupDirectionEnum = builder.enumType("BackupDirection", {
  values: ["TO_LOCAL", "TO_SDCARD"] as const,
});

const SdcardThemesInput = builder.inputType("SdcardThemesInput", {
  fields: (t) => ({
    ids: t.stringList({
      required: true,
      description: "List of theme directory names to backup",
    }),
  }),
});

const SdcardModelsInput = builder.inputType("SdcardModelsInput", {
  fields: (t) => ({
    ids: t.idList({
      required: true,
      description: "List of model directory names to backup",
    }),
  }),
});

const ConflictResolutionInput = builder.inputType("ConflictResolutionInput", {
  fields: (t) => ({
    path: t.string({ required: true }),
    action: t.field({
      type: builder.enumType("ConflictAction", {
        values: ["OVERWRITE", "SKIP", "RENAME"] as const,
      }),
      required: true,
    }),
  }),
});

const ConflictResolutionsInput = builder.inputType("ConflictResolutionsInput", {
  fields: (t) => ({
    items: t.field({
      type: [ConflictResolutionInput],
      required: true,
    }),
  }),
});

const RestoreOptionsInput = builder.inputType("RestoreOptionsInput", {
  fields: (t) => ({
    conflictResolutions: t.field({
      type: ConflictResolutionsInput,
      required: true,
    }),
    overwrite: t.boolean(),
    autoRename: t.boolean(),
  }),
});

const SdcardModelEntry = builder.simpleObject("SdcardModelEntry", {
  fields: (t) => ({
    name: t.string(),
    yaml: t.string(),
    directoryId: t.id(),
  }),
});

const SdcardRadioEntry = builder.simpleObject("SdcardRadioEntry", {
  fields: (t) => ({
    name: t.string(),
    yaml: t.string(),
  }),
});

/**
 * Try to find the sounds which are the most up to date
 * for the same sdcard minor version
 */
const findBestReleaseForPack = <
  T extends { prerelease: boolean; tag_name: string }
>(
  packVersion: string,
  isPrerelease: boolean,
  sortedReleases: T[]
): T | undefined =>
  sortedReleases.find(
    (r) =>
      (semver.valid(r.tag_name) &&
        semver.valid(packVersion) &&
        semver.major(r.tag_name) === semver.major(packVersion) &&
        semver.minor(r.tag_name) <= semver.minor(packVersion) &&
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

        // TODO: enable this for non testing
        if (!release && process.env.NODE_ENV === "test") {
          // undocumented behaviour, allow id of a commit to be given
          const commit = (
            await github("GET /repos/{owner}/{repo}/commits/{ref}", {
              owner: config.github.organization,
              repo: config.github.repos.sdcard,
              ref: id.toString(),
            }).catch(() => ({ data: undefined }))
          ).data;

          if (!commit) {
            return null;
          }
          return {
            id: id.toString(),
            targets: [],
            name: id.toString(),
            isPrerelease: false,
            // TODO: can we extract assets from source
            artifacts: [],
          };
        }

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
    //! new new may need refined into using predefined logic -----------------------
    sdcardAssetsDirectory: t.field({
      type: SdcardAssetsDirectory,
      nullable: true,
      args: {
        id: t.arg.id({ required: true }),
      },
      resolve: async (_, { id }) => {
        console.log("🔥 resolver sdcardAssetsDirectory for id=", id);

        const entry = directories.find((d) => d.id === id);
        if (!entry) return null;
        try {
          await arrayFromAsync(entry.handle.keys());
          return { id, name: entry.handle.name };
        } catch {
          return null;
        }
      },
    }),
    //! new new may need refined into using predefined logic -----------------------
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

const SDCARD_ARTIFACTS_REGEX =
  /edgetx-sdcard-sounds-(.+)-(?:([0-9]+.[0-9]+.[0-9]+(-.*)?)|(latest)).zip/;

const isSoundsArtifact = (artifactName: string): boolean =>
  !!SDCARD_ARTIFACTS_REGEX.exec(artifactName);
const extractSoundsId = (artifactName: string): string | undefined =>
  SDCARD_ARTIFACTS_REGEX.exec(artifactName)?.[1];

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
                        data.assets.find(
                          (asset) =>
                            extractSoundsId(asset.name) ===
                            (ISO_TO_SOUND_NAMES[soundId] ?? soundId)
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
    //! new new may need refined into using predefined logic -----------------------
    pickSdcardAssetsDirectory: t.field({
      type: SdcardAssetsDirectory,
      nullable: true,
      resolve: async (_, __, { fileSystem }) => {
        const handle = await fileSystem
          .requestWritableDirectory({ id: "edgetx-sdcard" })
          .catch(() => undefined);
        if (!handle) return null;
        const id = uuid.v4();
        directories.push({ id, handle });
        if (directories.length > maxDirectoriesHandles) directories.shift();
        return { id, name: handle.name };
      },
    }),
    createSdcardBackupJob: t.field({
      type: SdcardWriteJob,
      args: {
        directoryId: t.arg.id({ required: true }),
        models: t.arg({ type: SdcardModelsInput }),
        themes: t.arg({ type: SdcardThemesInput }),
        direction: t.arg({ type: BackupDirectionEnum, required: true }),
      },
      resolve: async (_, args, context: Context) => {
        const directoryId = String(args.directoryId);
        const entry = directories.find((d) => d.id === directoryId);
        if (!entry) {
          throw new GraphQLError("SD card directory not found");
        }

        const localHandle = await context.fileSystem
          .requestWritableDirectory({ id: "local-backup" })
          .catch(() => {
            throw new GraphQLError("Local directory not selected");
          });

        const selectedModels = args.models?.ids ?? [];
        const selectedThemes = args.themes?.ids ?? [];
        if (!selectedModels.length && !selectedThemes.length) {
          throw new GraphQLError("No models or themes specified");
        }

        const sourceHandle =
          args.direction === "TO_LOCAL" ? entry.handle : localHandle;
        const targetHandle =
          args.direction === "TO_LOCAL" ? localHandle : entry.handle;

        const job = context.sdcardJobs.createSdcardJob(["write"]);

        void startBackupExecution(job.id.toString(), {
          sourceHandle,
          targetHandle,
          filterPaths: selectedModels
            .map((m) => `MODELS/${m}`)
            .concat(selectedThemes.map((th) => `THEMES/${th}`)),
          overwrite: false,
          autoRename: true,
        });

        return job;
      },
    }),
    generateBackupPlan: t.field({
      type: BackupPlan,
      args: {
        directoryId: t.arg.id({ required: true }),
        paths: t.arg({ type: SdcardPathsInput, required: true }),
        direction: t.arg({ type: BackupDirectionEnum, required: true }),
      },
      resolve: async (_, { directoryId, paths, direction }, { fileSystem }) => {
        const entry = directories.find((d) => d.id === directoryId);
        if (!entry) throw new GraphQLError("SD card directory not found");

        const localHandle =
          direction === "TO_LOCAL"
            ? await fileSystem
                .requestWritableDirectory({ id: "local-backup" })
                .catch(() => {
                  throw new GraphQLError("Local backup directory not selected");
                })
            : entry.handle;
        const sdHandle = direction === "TO_LOCAL" ? entry.handle : localHandle;

        let raw;
        try {
          raw = await buildBackupPlan(sdHandle, localHandle, paths.paths);
        } catch (err: unknown) {
          if (err instanceof DOMException && err.name === "NotFoundError") {
            throw new GraphQLError(
              `Could not find one of the requested paths: ${err.message}`
            );
          }
          throw err;
        }

        return {
          toCopy: raw.toCopy,
          identical: raw.identical,
          conflicts: raw.conflicts.map(({ path, srcSize, dstSize }) => ({
            path,
            existingSize: dstSize,
            incomingSize: srcSize,
          })),
        };
      },
    }),
    executeBackup: t.field({
      type: SdcardWriteJob,
      args: {
        directoryId: t.arg.id({ required: true }),
        paths: t.arg({ type: SdcardPathsInput, required: true }),
        direction: t.arg({ type: BackupDirectionEnum, required: true }),
        conflictResolutions: t.arg({
          type: ConflictResolutionsInput,
          required: true,
        }),
      },
      resolve: async (
        _,
        { directoryId, paths, direction, conflictResolutions },
        context
      ) => {
        console.log(
          "🔥 executeBackup resolver firing for",
          directoryId,
          paths,
          direction
        );
        const entry = directories.find((d) => d.id === directoryId);
        console.log("   found entry?", !!entry);
        if (!entry) throw new GraphQLError("SD card directory not found");

        const localHandle =
          direction === "TO_LOCAL"
            ? await context.fileSystem
                .requestWritableDirectory({
                  id: "local-backup",
                })
                .catch(() => {
                  throw new GraphQLError("Local backup directory not selected");
                })
            : entry.handle;
        const sdHandle = direction === "TO_LOCAL" ? entry.handle : localHandle;

        const job = context.sdcardJobs.createSdcardJob(["download", "write"]);

        const execArgs = {
          sourceHandle: direction === "TO_LOCAL" ? sdHandle : localHandle,
          targetHandle: direction === "TO_LOCAL" ? localHandle : sdHandle,
          filterPaths: paths.paths,
          conflictResolutions: conflictResolutions.items,
        };
        setTimeout(() => {
          console.log("   calling startAssetsExecution with jobId=", job.id);
          void startBackupExecution(job.id.toString(), execArgs);
        }, 0);
        return job;
      },
    }),
    exportBackupToZip: t.field({
      type: "String",
      args: {
        directoryId: t.arg.id({ required: true }),
        paths: t.arg({ type: SdcardPathsInput, required: true }),
      },
      resolve: async (_, { directoryId, paths }) => {
        const entry = directories.find((d) => d.id === directoryId);
        if (!entry) throw new GraphQLError("SD card directory not found");
        const zipBlob = await exportBackupToZip(entry.handle, paths.paths);
        const arrayBuf = await zipBlob.arrayBuffer();
        const b64 = Buffer.from(arrayBuf).toString("base64");
        return `data:application/zip;base64,${b64}`;
      },
    }),
    createSdcardRestoreJob: t.field({
      type: SdcardWriteJob,
      args: {
        directoryId: t.arg.id({ required: true }),
        zipData: t.arg.string({ required: true }),
        options: t.arg({ type: RestoreOptionsInput, required: true }),
      },
      resolve(_, { directoryId, zipData, options }, context) {
        const entry = directories.find((d) => d.id === directoryId);
        if (!entry) throw new GraphQLError("SD card directory not found");

        const buf = Buffer.from(
          zipData.replace(/^data:.*;base64,/, ""),
          "base64"
        );

        // create the job record
        const job = context.sdcardJobs.createSdcardJob(["download", "write"]);

        // kick off the real restore engine, not just unzip
        setTimeout(() => {
          startRestoreExecution(job.id.toString(), buf, entry.handle, {
            conflictResolutions: options.conflictResolutions.items,
            overwrite: options.overwrite ?? false,
            autoRename: options.autoRename ?? false,
          }).catch((err) => console.error("restore failed", err));
        }, 0);

        return job;
      },
    }),

    //! new new may need refined into using predefined logic -----------------------
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

      if (artifacts.length === 0 && process.env.NODE_ENV === "test") {
        return targets;
      }

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
        .filter((artifact) => isSoundsArtifact(artifact.name))
        .map(
          (artifact) =>
            // We have just filtered for this, so should be ok
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            extractSoundsId(artifact.name)!
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

builder.mutationField("generateRestorePlan", (t) =>
  t.field({
    type: BackupPlan,
    args: {
      directoryId: t.arg.id({ required: true }),
      zipData: t.arg.string({ required: true }),
    },
    resolve: async (_, { directoryId, zipData }) => {
      const entry = directories.find((d) => d.id === directoryId);
      if (!entry) throw new GraphQLError("SD card not found");

      // decode base64
      const b64 = zipData.replace(/^data:.*;base64,/, "");
      const buf = Buffer.from(b64, "base64");

      // build the raw plan (with srcSize/dstSize)
      const raw = await buildRestorePlan(buf, entry.handle);

      // remap to GraphQL shape
      return {
        toCopy: raw.toCopy,
        identical: raw.identical,
        conflicts: raw.conflicts.map(({ path, srcSize, dstSize }) => ({
          path,
          incomingSize: srcSize,
          existingSize: dstSize,
        })),
      };
    },
  })
);

builder.objectFields(SdcardModelEntry, (t) => ({
  parsed: t.field({
    type: "JSON",
    nullable: true,
    resolve: ({ yaml: txt }) => {
      try {
        return txt ? yaml.load(txt) : null;
      } catch {
        return null;
      }
    },
  }),
  bitmapName: t.string({
    nullable: true,
    resolve: ({ yaml: txt }): string | null => {
      if (!txt) return null;
      type ModelDoc = { header?: { bitmap?: unknown } };
      const loaded = yaml.load(txt) as ModelDoc;
      const { header } = loaded;
      if (!header || typeof header.bitmap !== "string") {
        return null;
      }
      return header.bitmap;
    },
  }),
  bitmapDataUrl: t.string({
    nullable: true,
    resolve: async ({ directoryId, yaml: txt }): Promise<string | null> => {
      if (!txt) return null;

      type ModelDoc = { header?: { bitmap?: unknown } };
      let raw: unknown;
      try {
        raw = yaml.load(txt);
      } catch {
        return null;
      }

      if (
        typeof raw !== "object" ||
        raw === null ||
        typeof (raw as ModelDoc).header !== "object"
      ) {
        return null;
      }
      const header = (raw as ModelDoc).header!;

      if (typeof header.bitmap !== "string") {
        return null;
      }

      const bmp = header.bitmap;

      try {
        const assets = getDirectoryHandle(directoryId.toString());
        const imgs = await assets.getDirectoryHandle("IMAGES", {
          create: false,
        });
        const fileHandle = await imgs.getFileHandle(bmp, { create: false });
        const blob = await fileHandle.getFile();
        const arrayBuf = await blob.arrayBuffer();
        const b64 = Buffer.from(arrayBuf).toString("base64");
        const ext = bmp.split(".").pop() ?? "png";
        return `data:image/${ext};base64,${b64}`;
      } catch (e) {
        if (e instanceof DOMException && e.name === "NotFoundError") {
          console.warn(`Could not find "${bmp}" in IMAGES/—returning null`);
          return null;
        }

        console.error("Unexpected filesystem error while loading bitmap:", e);
        return null;
      }
    },
  }),
}));

builder.objectFields(SdcardRadioEntry, (t) => ({
  parsed: t.field({
    type: "JSON",
    nullable: true,
    resolve: ({ yaml: yamlText }: { yaml: string }) => {
      try {
        return yamlText ? yaml.load(yamlText) : null;
      } catch {
        return null;
      }
    },
  }),
}));

builder.objectFields(SdcardAssetsDirectory, (t) => ({
  isValid: t.boolean({
    resolve: async ({ id }) => {
      const handle = getDirectoryHandle(id.toString());
      return !!(await findAsync(handle.keys(), (entry) =>
        EXPECTED_ROOT_ENTRIES.includes(entry)
      ));
    },
  }),
  models: t.field({
    type: [SdcardModelEntry],
    resolve: async ({ id }) => {
      const root = getDirectoryHandle(id.toString());
      const modelsDir = await root
        .getDirectoryHandle("MODELS", { create: true })
        .catch(() => undefined);
      if (!modelsDir) return [];

      const entries = await arrayFromAsync(modelsDir.values());
      const ymlFiles = entries.filter(
        (e): e is FileSystemFileHandle =>
          e.kind === "file" && e.name.toLowerCase().endsWith(".yml")
      );

      return Promise.all(
        ymlFiles.map(async (file) => {
          const blob = await file.getFile();
          const text = await blob.text();
          return {
            name: file.name,
            yaml: text,
            directoryId: id.toString(),
          };
        })
      );
    },
  }),
  radio: t.field({
    type: [SdcardRadioEntry],
    resolve: async ({ id }) => {
      const root = getDirectoryHandle(id.toString());
      const radioDir = await root
        .getDirectoryHandle("RADIO", { create: true })
        .catch(() => undefined);
      if (!radioDir) return [];

      const entries = await arrayFromAsync(radioDir.values());
      const ymlFiles = entries.filter(
        (e): e is FileSystemFileHandle =>
          e.kind === "file" && e.name.toLowerCase().endsWith(".yml")
      );

      const result = await Promise.all(
        ymlFiles.map(async (file) => {
          const blob = await file.getFile();
          const text = await blob.text();
          return {
            name: file.name,
            yaml: text,
          };
        })
      );
      return result;
    },
  }),
  themes: t.field({
    type: [SdcardThemeEntry],
    resolve: async (
      /** parent.id is string|number */ parent
    ): Promise<
      {
        name: string;
        yaml: string;
        logoUrl?: string;
        backgroundUrl?: string;
      }[]
    > => {
      // coerce to string
      const id = parent.id.toString();
      const root = getDirectoryHandle(id);
      const themesDir = await root
        .getDirectoryHandle("THEMES", { create: true })
        .catch(() => undefined);
      if (!themesDir) return [];

      // get each sub-folder
      const entries = await arrayFromAsync(themesDir.values());
      const folders = entries.filter(
        (e): e is FileSystemDirectoryHandle => e.kind === "directory"
      );

      // helper to make a data-URL from a FileSystemFileHandle
      const toDataUrl = async (fh: FileSystemFileHandle): Promise<string> => {
        const file = await fh.getFile();
        const buf = await file.arrayBuffer();
        return `data:${file.type};base64,${Buffer.from(buf).toString(
          "base64"
        )}`;
      };

      return Promise.all(
        folders.map(async (folder) => {
          const files = await arrayFromAsync(folder.values());

          const yamlHandle = files.find(
            (f): f is FileSystemFileHandle =>
              f.kind === "file" && f.name.toLowerCase().endsWith(".yml")
          );
          const logoHandle = files.find(
            (f): f is FileSystemFileHandle =>
              f.kind === "file" && f.name.toLowerCase() === "logo.png"
          );
          const bgHandle = files.find(
            (f): f is FileSystemFileHandle =>
              f.kind === "file" && f.name.toLowerCase() === "background.png"
          );

          // read theme.yml into a string
          const themeYaml = yamlHandle
            ? await (await yamlHandle.getFile()).text()
            : "";

          // read PNGs into data-URLs
          const logoUrl = logoHandle ? await toDataUrl(logoHandle) : undefined;
          const backgroundUrl = bgHandle
            ? await toDataUrl(bgHandle)
            : undefined;

          return {
            name: folder.name,
            yaml: themeYaml,
            logoUrl,
            backgroundUrl,
          };
        })
      );
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
