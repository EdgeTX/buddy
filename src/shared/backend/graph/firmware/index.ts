import { GraphQLError } from "graphql";
import config from "shared/config";

import { Context } from "shared/backend/context";
import SchemaBuilder from "@pothos/core";
import SimpleObjectsPlugin from "@pothos/plugin-simple-objects";

const schema = new SchemaBuilder<{ Context: Context }>({
  plugins: [SimpleObjectsPlugin],
});

const LocalEdgeTxFirmwareRef = schema.simpleObject("LocalEdgeTxFirmware", {
  fields: (t) => ({
    id: t.id(),
    name: t.string(),
    base64Data: t.string(),
  }),
});

schema.mutationFields((t) => ({
  registerLocalFirmware: t.field({
    type: LocalEdgeTxFirmwareRef,
    args: {
      fileName: t.arg.string({
        required: false,
      }),
      firmwareBase64Data: t.arg.string({ required: true }),
    },
    resolve: (_, { fileName, firmwareBase64Data }, { firmwareStore }) => {
      const id = firmwareStore.registerFirmware(
        Buffer.from(firmwareBase64Data, "base64"),
        fileName ?? undefined
      );

      return { id, name: fileName ?? id, base64Data: firmwareBase64Data };
    },
  }),
}));

const EdgeTxFirmwareTarget = schema.simpleObject("EdgeTxFirmwareTarget", {
  fields: (t) => ({
    id: t.id(),
    code: t.string(),
    name: t.string(),
    bundleUrl: t.string(),
  }),
});

const EdgeTxFirmwareBundle = schema.simpleObject("EdgeTxFirmwareTarget", {
  fields: (t) => ({
    id: t.id(),
    url: t.string(),
  }),
});

const EdgeTxPrCommit = schema.simpleObject("EdgeTxPrCommit", {
  fields: (t) => ({
    id: t.id(),
    firmwareBundle: t.field({
      type: EdgeTxFirmwareBundle,
      nullable: true,
    }),
  }),
});

const EdgeTxPr = schema.simpleObject("EdgeTxPr", {
  fields: (t) => ({
    id: t.id(),
    name: t.string(),
    title: t.string(),
    description: t.string({ nullable: true }),
    headCommitId: t.string(),
  }),
});

const EdgeTxReleaseRef = schema.simpleObject("EdgeTxRelease", {
  fields: (t) => ({
    id: t.id(),
    isPrerelease: t.boolean(),
    name: t.string(),
    description: t.string({ nullable: true }),
    firmwareBundle: t.field({ type: EdgeTxFirmwareBundle }),
    assets: t.field({
      type: [
        schema.simpleObject("EdgeTxReleaseAsset", {
          fields: (t_) => ({
            id: t_.id(),
            name: t_.string(),
            url: t_.string(),
          }),
        }),
      ],
    }),
  }),
});

schema.queryFields((t) => ({
  edgeTxReleases: t.field({
    type: [EdgeTxReleaseRef],
    resolve: async (_, __, { github }) => {
      const releasesRequest = await github(
        "GET /repos/{owner}/{repo}/releases",
        {
          owner: config.github.organization,
          repo: config.github.repos.firmware,
        }
      );

      return releasesRequest.data.map((release) => ({
        id: release.tag_name,
        name: release.name ?? release.tag_name,
        description: release.body_text,
        isPrerelease: release.prerelease,
        // Will be resolved in the release object
        firmwareBundle: {
          id: "",
          name: "",
          url: "",
        },
        assets: release.assets.map((asset) => ({
          id: asset.id.toString(),
          name: asset.name,
          url: asset.browser_download_url,
        })),
      }));
    },
  }),
  edgeTxRelease: t.field({
    type: EdgeTxReleaseRef,
    nullable: true,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: async (_, { id }, { github }) => {
      const releaseRequest = await github(
        "GET /repos/{owner}/{repo}/releases/tags/{tag}",
        {
          owner: config.github.organization,
          repo: config.github.repos.firmware,
          tag: id.toString(),
        }
      ).catch((e: { status?: number } | Error) => {
        if ("status" in e && e.status && e.status === 404) {
          return undefined;
        }
        throw e as Error;
      });

      if (!releaseRequest) {
        return null;
      }
      const release = releaseRequest.data;

      return {
        id: release.tag_name,
        name: release.name ?? release.tag_name,
        description: release.body,
        isPrerelease: release.prerelease,
        firmwareBundle: {
          id: "",
          name: "",
          url: "",
        },
        assets: release.assets.map((asset) => ({
          id: asset.id.toString(),
          name: asset.name,
          url: asset.browser_download_url,
        })),
      };
    },
  }),
  edgeTxPrs: t.field({
    type: [EdgeTxPr],
    resolve: async (_, __, { github }) => {
      const prs = await github("GET /repos/{owner}/{repo}/pulls", {
        owner: config.github.organization,
        repo: config.github.repos.firmware,
        sort: "created",
        state: "open",
        direction: "desc",
      });

      return prs.data.map((pr) => ({
        id: pr.number.toString(),
        name: pr.head.label,
        headCommitId: pr.head.sha,
        title: pr.title,
        description: pr.body ?? null,
      }));
    },
  }),
  edgeTxPr: t.field({
    type: EdgeTxPr,
    nullable: true,
    resolve: async (_, { id }, { github }) => {
      const pr = (
        await github("GET /repos/{owner}/{repo}/pulls/{pull_number}", {
          owner: config.github.organization,
          repo: config.github.repos.firmware,
          pull_number: Number(id),
        })
      ).data;

      return {
        id: pr.number.toString(),
        name: pr.head.label,
        headCommitId: pr.head.sha,
        title: pr.title,
        description: pr.body ?? null,
      };
    },
  }),
  localFirmware: t.field({
    type: LocalEdgeTxFirmwareRef,
    nullable: true,
    args: {
      byId: t.arg.id({ required: true }),
    },
    resolve: (_, { byId }, { firmwareStore }) => {
      const file = firmwareStore.getLocalFirmwareById(byId.toString());

      if (!file) {
        return null;
      }

      return {
        id: file.id,
        name: file.name ?? file.id,
        base64Data: file.data.toString("base64"),
      };
    },
  }),
}));

schema.objectFields(EdgeTxReleaseRef, (t) => ({
  firmwareBundle: t.field({
    type: EdgeTxFirmwareBundle,
    resolve: (release) => {
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
  }),
}));

schema.objectFields(EdgeTxFirmwareBundle, (t) => ({
  target: t.field({
    type: EdgeTxFirmwareTarget,
    nullable: true,
    args: {
      code: t.arg.id({
        required: true,
      }),
    },
    resolve: (firmwareBundle, { code }, { firmwareStore }) =>
      firmwareStore
        .firmwareTargets(firmwareBundle.url)
        .then((firmwareTargets) => {
          const target = firmwareTargets.find((ft) => ft.code === code);
          return target
            ? {
                id: `${target.code}-${firmwareBundle.id}`,
                code: target.code,
                bundleUrl: firmwareBundle.url,
                name: target.name,
              }
            : null;
        }),
  }),
  targets: t.field({
    type: [EdgeTxFirmwareTarget],
    resolve: (firmwareBundle, _, { firmwareStore }) =>
      firmwareStore
        .firmwareTargets(firmwareBundle.url)
        .then((firmwareTargets) =>
          firmwareTargets.map((target) => ({
            id: `${target.code}-${firmwareBundle.id}`,
            code: target.code,
            bundleUrl: firmwareBundle.url,
            name: target.name,
          }))
        ),
  }),
}));

schema.objectFields(EdgeTxFirmwareTarget, (t) => ({
  base64Data: t.string({
    resolve: async (target, _, { firmwareStore }) => {
      const firmware = await firmwareStore.fetchFirmware(
        target.bundleUrl,
        target.code
      );
      return firmware.toString("base64");
    },
  }),
}));

schema.objectFields(EdgeTxPr, (t) => ({
  commits: t.field({
    type: [EdgeTxPrCommit],
    resolve: async ({ id }, _, { github }) => {
      const commits = await github(
        "GET /repos/{owner}/{repo}/pulls/{pull_number}/commits",
        {
          repo: config.github.repos.firmware,
          owner: config.github.organization,
          pull_number: Number(id),
        }
      );

      return commits.data.map((commit) => ({
        id: commit.sha,
        firmwareBundle: null,
      }));
    },
  }),
  commit: t.field({
    type: EdgeTxPrCommit,
    nullable: true,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: (_, { id }) => ({
      id: id.toString(),
      firmwareBundle: null,
    }),
  }),
}));

schema.objectFields(EdgeTxPrCommit, (t) => ({
  firmwareBundle: t.field({
    type: EdgeTxFirmwareBundle,
    nullable: true,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: async ({ id }, _, { firmwareStore }) => {
      const firmwareAsset = await firmwareStore.fetchPrBuild(id.toString());

      if (!firmwareAsset) {
        return null;
      }

      return {
        id: firmwareAsset.id,
        url: firmwareAsset.url,
      };
    },
  }),
}));

export default {
  schema: schema.toSchema({}),
};
