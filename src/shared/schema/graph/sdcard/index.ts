import gql from "graphql-tag";
import {
  Resolvers,
  SdcardWriteFileStatus,
  SdcardWriteJob,
  SdcardWriteJobStages,
} from "../__generated__";
import * as uuid from "uuid";
import { GraphQLError } from "graphql";
import ky, { DownloadProgress } from "ky";
import { unzipRaw, ZipEntry } from "unzipit";
import { PubSub } from "graphql-subscriptions";
import { debounce } from "debounce";
import pLimit from "p-limit";

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

const nameToId = (name: string): string =>
  name.split(" ").join("-").toLowerCase();

const typeDefs = gql`
  type Query {
    sdcardTargets: [SdcardTarget!]!
    sdcardSounds: [SdcardSoundsAsset!]!
    folderInfo(id: ID!): FileSystemFolder
    sdcardWriteJobStatus(jobId: ID!): SdcardWriteJob
  }

  type Mutation {
    pickSdcardFolder: FileSystemFolder
    createSdcardWriteJob(
      folderId: ID!
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
    startTime: String
    completedTime: String
  }

  type FileSystemFolder {
    id: ID!
    name: String!
  }

  type SdcardTarget {
    id: ID!
    name: String!
    tag: String!
  }

  type SdcardSoundsAsset {
    id: ID!
    name: String!
    tag: String!
  }
`;

const resolvers: Resolvers = {
  Query: {
    sdcardTargets: async (_, __, { github }) => {
      const release = (
        await github("GET /repos/{owner}/{repo}/releases/latest", {
          owner: "EdgeTX",
          repo: "edgetx-sdcard",
        })
      ).data;

      const sdcardAssets = release.assets;
      return sdcardAssets.flatMap((asset) =>
        targetsToAssets
          .filter((radio) => radio.asset === asset.name)
          .map((radio) => ({
            ...radio,
            id: nameToId(radio.name),
            tag: release.tag_name,
          }))
      );
    },
    sdcardSounds: async (_, __, { github }) => {
      const soundsRelease = (
        await github("GET /repos/{owner}/{repo}/releases/latest", {
          owner: "EdgeTX",
          repo: "edgetx-sdcard-sounds",
        })
      ).data;

      return soundsRelease.assets
        .filter((asset) => asset.name.includes("edgetx-sdcard-sounds-"))
        .map(
          (asset) => asset.name.split("edgetx-sdcard-sounds-")[1].split("-")[0]
        )
        .map((name) => ({
          id: name,
          name: name.toUpperCase(),
          tag: soundsRelease.tag_name,
        }));
    },
    folderInfo: (_, { id }) => {
      const handle = directories.find(
        (directory) => directory.id === id
      )?.handle;

      return handle ? { id, name: handle.name } : null;
    },
    sdcardWriteJobStatus: (_, { jobId }) => getSdcardJob(jobId) ?? null,
  },
  Subscription: {
    sdcardWriteJobUpdates: {
      subscribe: (_, { jobId }) => ({
        [Symbol.asyncIterator]() {
          return jobUpdates.asyncIterator<SdcardWriteJob>(jobId);
        },
      }),
      resolve: (value: SdcardWriteJob) => value,
    },
  },
  Mutation: {
    cancelSdcardWriteJob: (_, { jobId }) => {
      const job = getSdcardJob(jobId);
      if (!job) {
        throw new GraphQLError("Job doesnt exist");
      }

      if (job.cancelled) {
        throw new GraphQLError("Job already cancelled");
      }
      cancelSdcardJob(jobId);

      return null;
    },
    pickSdcardFolder: async (_, __, { fileSystem }) => {
      const handle = await fileSystem
        .requestWritableFolder({
          id: "edgetx-sdcard",
        })
        .catch(() => undefined);

      if (!handle) {
        return null;
      }

      const id = uuid.v1();
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
      };
    },
    createSdcardWriteJob: async (
      _,
      { folderId, target, clean, sounds },
      { github }
    ) => {
      const directory = directories.find(
        (directory) => directory.id === folderId
      );

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
        github("GET /repos/{owner}/{repo}/releases/latest", {
          owner: "EdgeTX",
          repo: "edgetx-sdcard",
        }).then(
          ({ data }) =>
            data.assets.find((asset) => asset.name === requiredAssetName)
              ?.browser_download_url
        ),
        github("GET /repos/{owner}/{repo}/releases/latest", {
          owner: "EdgeTX",
          repo: "edgetx-sdcard-sounds",
        }).then(
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

      const job = createSdcardJob(
        clean ? ["download", "erase", "write"] : ["download", "write"]
      );

      (async () => {
        console.log("downloading");
        const zipEntries = await download(job.id, [
          sdcardAssetUrl,
          soundsAssetUrl,
        ]);

        if (isCancelled(job.id)) {
          return;
        }

        if (clean) {
          console.log("cleaning");
          await erase(job.id, directory.handle);
        }

        if (isCancelled(job.id)) {
          return;
        }

        console.log("writing");

        await writeAssets(job.id, directory.handle, zipEntries);
      })().catch((e) => {
        console.error(e);
        cancelSdcardJob(job.id);
      });

      return job;
    },
  },
};

const maxDirectoriesHandles = 5;
const directories: {
  handle: FileSystemDirectoryHandle;
  id: string;
}[] = [];

const jobUpdates = new PubSub();
const sdcardJobs: Record<string, SdcardWriteJob> = {};

const createSdcardJob = (
  stages: (keyof Omit<SdcardWriteJobStages, "__typename">)[]
) => {
  const id = uuid.v1();
  const job: SdcardWriteJob = {
    id,
    cancelled: false,
    stages: Object.fromEntries(
      stages.map((stage) => [
        stage,
        {
          started: false,
          completed: false,
          progress: 0,
          ...(stage === "write" ? { writes: [] } : undefined),
        },
      ])
    ) as unknown as SdcardWriteJobStages,
  };
  sdcardJobs[id] = job;
  return job;
};

const getSdcardJob = (jobId: string): SdcardWriteJob | undefined =>
  sdcardJobs[jobId];

const debouncedPublish = debounce(jobUpdates.publish.bind(jobUpdates), 10);

const updateSdcardJob = (jobId: string, updatedJob: SdcardWriteJob) => {
  sdcardJobs[jobId] = updatedJob;
  debouncedPublish(jobId, updatedJob);
};

const updateStageStatus = <
  S extends keyof Omit<SdcardWriteJobStages, "__typename">
>(
  jobId: string,
  stage: S,
  status: Partial<Omit<NonNullable<SdcardWriteJobStages[S]>, "__typename">>
) => {
  const job = getSdcardJob(jobId);
  if (!job) {
    return;
  }

  updateSdcardJob(jobId, {
    ...job,
    stages: { ...job.stages, [stage]: { ...job.stages[stage], ...status } },
  });
};

const updateSdcardWriteFileStatus = (
  jobId: string,
  write: SdcardWriteFileStatus
) => {
  const job = getSdcardJob(jobId);
  updateStageStatus(jobId, "write", {
    writes: (
      job?.stages.write.writes.filter(({ name }) => name !== write.name) ?? []
    ).concat([write]),
  });
};

const cancelSdcardJob = (jobId: string) => {
  const job = getSdcardJob(jobId);
  if (!job) {
    return;
  }

  updateSdcardJob(jobId, { ...job, cancelled: true });
};

const isCancelled = (jobId: string): boolean => {
  return getSdcardJob(jobId)?.cancelled ?? true;
};

/**
 * Download both of these assets
 */
const download = async (
  jobId: string,
  assetUrls: string[]
): Promise<ZipEntry[]> => {
  updateStageStatus(jobId, "download", {
    started: true,
  });

  const downloadProgressTrackers = assetUrls.map(() => ({
    totalBytes: 0,
    transferredBytes: 0,
  }));

  const onDownloadProgress = (key: number, progress: DownloadProgress) => {
    downloadProgressTrackers[key] = progress;
    if (
      downloadProgressTrackers.filter(({ totalBytes }) => totalBytes > 0)
        .length === assetUrls.length
    ) {
      const total = downloadProgressTrackers.reduce(
        (acc, tracker) => acc + tracker.totalBytes,
        0
      );
      const transferred = downloadProgressTrackers.reduce(
        (acc, tracker) => acc + tracker.transferredBytes,
        0
      );

      updateStageStatus(jobId, "download", {
        progress: (transferred / total) * 100,
      });
    }
  };

  const assets = await Promise.all(
    assetUrls.map((assetUrl, i) =>
      ky(`http://localhost:8080/${assetUrl}`, {
        onDownloadProgress: (progress) => {
          onDownloadProgress(i, progress);
        },
      }).then((res) => res.blob())
    )
  );

  const unzippedAssets = await Promise.all(
    assets.map((asset) => unzipRaw(asset))
  );

  updateStageStatus(jobId, "download", {
    completed: true,
  });

  return unzippedAssets.reduce(
    (acc, { entries }) => acc.concat(entries),
    [] as ZipEntry[]
  );
};

const erase = async (
  jobId: string,
  rootHandle: FileSystemDirectoryHandle
): Promise<void> => {
  updateStageStatus(jobId, "erase", { started: true });
  let progress = 0;

  const entries: FileSystemHandle[] = [];

  for await (const entry of rootHandle.values()) {
    entries.push(entry);
  }

  console.log(entries)
  await Promise.all(
    entries.map(async (entry) => {
      await rootHandle.removeEntry(
        entry.name,
        entry.kind === "directory" ? { recursive: true } : undefined
      ).catch(e => {
        // Some weird macos folder
        if ((e as Error).message.includes('An operation that depends on state cached in an interface object')) {
          return;
        }
        throw e;
      });
      progress += 1;
      updateStageStatus(jobId, "erase", {
        progress: (progress / entries.length) * 100,
      });
    })
  );

  updateStageStatus(jobId, "erase", { completed: true });
};

const writeAssets = async (
  jobId: string,
  rootHandle: FileSystemDirectoryHandle,
  zipEntries: ZipEntry[]
): Promise<void> => {
  updateStageStatus(jobId, "write", { started: true });

  const total = zipEntries.reduce((acc, entity) => acc + entity.size, 0);
  let progress = 0;

  const writeLimiter = pLimit(10);

  await Promise.all(
    zipEntries.map(async (file) => {
      if (isCancelled(jobId)) {
        return;
      }

      const started = new Date().getTime();
      const path = file.name.split("/");
      const fileName = path[path.length - 1];
      const isFolder = fileName.length === 0;
      if (isFolder) {
        updateSdcardWriteFileStatus(jobId, {
          name: file.name,
          startTime: started.toString(),
        });
      }

      // ensure the path exists
      // and recursively head down the tree
      // to get to the folder where this file needs
      // to go
      const fileDirectory = await path
        .slice(0, path.length - 1)
        .filter(Boolean)
        .reduce(
          async (prev, directory) =>
            prev.then(async (parentDirectory) =>
              parentDirectory.getDirectoryHandle(directory, {
                create: true,
              })
            ),
          Promise.resolve(rootHandle)
        );

      if (isCancelled(jobId)) {
        return;
      }

      // Only need to save a file if there was something after the folder
      if (!isFolder) {
        const fileHandle = await fileDirectory.getFileHandle(fileName, {
          create: true,
        });
        const blob = await file.blob();
        await writeLimiter(async () => {
          console.log("unpacked", file.name);
          updateSdcardWriteFileStatus(jobId, {
            name: file.name,
            startTime: started.toString(),
          });
          // Compat for electron main and the browser
          const stream = blob.stream() as
            | NodeJS.ReadableStream
            | ReadableStream;
          const pipeFunc =
            "pipe" in stream
              ? stream.pipe.bind(stream)
              : stream.pipeTo.bind(stream);
          const result = pipeFunc(
            (await fileHandle.createWritable()) as unknown as NodeJS.WritableStream &
              WritableStream
          );

          if ("end" in result) {
            return new Promise<void>((resolve) => result.end(resolve));
          } else {
            return result;
          }
        });

        progress += file.size;
      }

      updateStageStatus(jobId, "write", { progress: (progress / total) * 100 });
      updateSdcardWriteFileStatus(jobId, {
        name: file.name,
        startTime: started.toString(),
        completedTime: new Date().getTime().toString(),
      });
    })
  );

  updateStageStatus(jobId, "write", { completed: true });
};

export default {
  typeDefs,
  resolvers,
};
