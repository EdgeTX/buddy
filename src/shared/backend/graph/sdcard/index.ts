import gql from "graphql-tag";
import * as uuid from "uuid";
import { GraphQLError } from "graphql";
import { Resolvers, SdcardWriteJob } from "shared/backend/graph/__generated__";
import {
  cancelSdcardJob,
  createSdcardJob,
  getSdcardJob,
  jobUpdates,
  startExecution,
} from "./jobs";

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
    startTime: String!
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
          (asset) =>
            // We have just filtered for this, so should be ok
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            asset.name.split("edgetx-sdcard-sounds-")[1]!.split("-")[0]!
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
      context
    ) => {
      const directory = directories.find((d) => d.id === folderId);

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
            owner: "EdgeTX",
            repo: "edgetx-sdcard",
          })
          .then(
            ({ data }) =>
              data.assets.find((asset) => asset.name === requiredAssetName)
                ?.browser_download_url
          ),
        context
          .github("GET /repos/{owner}/{repo}/releases/latest", {
            owner: "EdgeTX",
            repo: "edgetx-sdcard-sounds",
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

      const job = createSdcardJob(
        clean ? ["download", "erase", "write"] : ["download", "write"]
      );

      await startExecution(
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
