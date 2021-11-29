import gql from "gql-tag";
import { GraphQLError } from "graphql";
import { EdgeTxFirmwareRelease, Resolvers } from "../__generated__";

const typeDefs = gql`
  type Query {
    edgeTxReleases: [EdgeTxRelease!]!
    edgeTxRelease(id: ID!): EdgeTxRelease
  }

  type EdgeTxRelease {
    id: ID!
    isPrerelease: Boolean!
    name: String!
    description: String
    firmware: EdgeTxFirmwareRelease!
    assets: [EdgeTxReleaseAsset!]!
  }

  type EdgeTxReleaseAsset {
    id: ID!
    name: String!
    url: String!
  }

  type EdgeTxFirmwareTarget {
    id: ID!
    name: String!
  }

  type EdgeTxFirmwareRelease {
    id: ID!
    url: String!
    targets: [EdgeTxFirmwareTarget!]!
  }
`;

const resolvers: Resolvers = {
  Query: {
    edgeTxReleases: async (_, __, { github }) => {
      const releasesRequest = await github(
        "GET /repos/{owner}/{repo}/releases",
        {
          owner: "EdgeTX",
          repo: "edgetx",
        }
      );

      if (releasesRequest.status !== 200) {
        throw new Error("Oh noes");
      }

      return releasesRequest.data.map((release) => ({
        id: release.tag_name,
        name: release.name ?? release.tag_name,
        description: release.body_text,
        isPrerelease: release.prerelease,
        firmware: {} as EdgeTxFirmwareRelease,
        assets: release.assets.map((asset) => ({
          id: asset.id.toString(),
          name: asset.name,
          url: asset.browser_download_url,
        })),
      }));
    },
    edgeTxRelease: async (_, { id }, { github }) => {
      const releaseRequest = await github(
        "GET /repos/{owner}/{repo}/releases/tags/{tag}",
        {
          owner: "EdgeTX",
          repo: "edgetx",
          tag: id,
        }
      ).catch((e: { status?: number } | Error) => {
        if ("status" in e && e.status && e.status === 404) {
          return undefined;
        }
        throw e;
      });

      if (!releaseRequest) {
        return null;
      }
      const release = releaseRequest.data;

      return {
        id: release.tag_name,
        name: release.name ?? release.tag_name,
        description: release.body_text,
        isPrerelease: release.prerelease,
        firmware: {} as EdgeTxFirmwareRelease,
        assets: release.assets.map((asset) => ({
          id: asset.id.toString(),
          name: asset.name,
          url: asset.browser_download_url,
        })),
      };
    },
  },

  EdgeTxRelease: {
    firmware: async (release, _) => {
      const firmwareAsset = release.assets.find((asset) =>
        asset.name.includes("firmware")
      );
      if (!firmwareAsset) {
        throw new GraphQLError("Error");
      }

      return {
        id: firmwareAsset.id,
        name: firmwareAsset.name,
        url: firmwareAsset.url,
        targets: [],
      };
    },
  },
  EdgeTxFirmwareRelease: {
    targets: (firmware, _, { firmwareStore }) =>
      firmwareStore.firmwareTargets(firmware.url).then((firmwareTargets) =>
        firmwareTargets.map((target) => ({
          id: target.code,
          name: target.name,
        }))
      ),
  },
};

export default {
  typeDefs,
  resolvers,
};
