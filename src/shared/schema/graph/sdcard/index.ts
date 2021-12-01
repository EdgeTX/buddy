import gql from "graphql-tag";
import { Resolvers } from "../__generated__";
import * as uuid from "uuid";
import { GraphQLError } from "graphql";
import ky from "ky";
import { unzipRaw } from "unzipit";

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
    folderInfo(id: ID!): FileSystemFolder
    sdcardWriteJobStatus(jobId: ID!): SdcardWriteJob!
  }

  type Mutation {
    pickFolder: FileSystemFolder
    createSdcardWriteJob(folderId: ID!, target: ID!, clean: Boolean): Boolean
  }

  type Subscription {
    sdcardWriteJobUpdates(jobId: ID!): SdcardWriteJob!
  }

  type SdcardWriteJob {
    id: ID!
    cancelled: Boolean!
    erased: Boolean
    downloadProgress: Float!
    writes: SdcardWriteFileStatus[];
  }

  type SdcardWriteFileStatus {
    name: String!
    startTime: Int
    completedTime: Int
  }

  type FileSystemFolder {
    id: ID!
    name: String!
  }

  type SdcardTarget {
    id: ID!
    name: String!
  }
`;

const resolvers: Resolvers = {
  Query: {
    sdcardTargets: async (_, __, { github }) => {
      const sdcardAssets = (
        await github("GET /repos/{owner}/{repo}/releases/latest")
      ).data.assets;

      return sdcardAssets.flatMap((asset) =>
        targetsToAssets
          .filter((radio) => radio.asset === asset.name)
          .map((radio) => ({ ...radio, id: nameToId(radio.name) }))
      );
    },
    folderInfo: (_, { id }) => {
      const handle = directories.find(
        (directory) => directory.id === id
      )?.handle;

      return handle ? { id, name: handle.name } : null;
    },
  },

  Mutation: {
    pickFolder: async () => {
      const handle = await window
        .showDirectoryPicker({
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
    createSdcardWriteJob: async (_, { folderId, target }, { github }) => {
      const handle = directories.find(
        (directory) => directory.id === folderId
      )?.handle;

      if (!handle) {
        throw new GraphQLError("Folder id doesnt exist");
      }

      const requiredAssetName = targetsToAssets.find(
        ({ name }) => nameToId(name) === target
      )?.asset;

      if (!requiredAssetName) {
        throw new GraphQLError("Target doesnt exist");
      }

      const assetUrl = (
        await github("GET /repos/{owner}/{repo}/releases/latest")
      ).data.assets.find((asset) => asset.name === requiredAssetName);

      if (!assetUrl) {
        throw new GraphQLError("Couldn't find asset url");
      }

      const id = uuid.v1();

      (async () => {
        const rootDirectory = await window.showDirectoryPicker({
          id: "edgetx-sdcard",
        });
        const contents = await (
          await ky(`http://localhost:8080/${assetUrl}`, {
            onDownloadProgress: (progress) => {
              console.log(progress);
            },
          })
        ).blob();
        const { entries: zipEntries } = await unzipRaw(contents);
        const total = zipEntries.reduce((acc, entity) => acc + entity.size, 0);

        let progress = 0;
        await Promise.all(
          zipEntries.map(async (file) => {
            const path = file.name.split("/");
            const fileName = path[path.length - 1];
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
                Promise.resolve(rootDirectory)
              );

            // Only need to save a file if there was something after the folder
            if (fileName.length > 0) {
              const fileHandle = await fileDirectory.getFileHandle(fileName, {
                create: true,
              });
              await (await file.blob())
                .stream()
                .pipeTo(await fileHandle.createWritable());

              progress += file.size;
            }
          })
        );
      })();

      return {
        id,
      };
    },
  },
};

const maxDirectoriesHandles = 5;
const directories: { handle: FileSystemDirectoryHandle; id: string }[] = [];

export default {
  typeDefs,
  resolvers,
};
