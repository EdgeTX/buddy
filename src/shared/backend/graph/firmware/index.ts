import { GraphQLError } from "graphql";
import config from "shared/backend/config";
import { createBuilder } from "shared/backend/utils/builder";

const builder = createBuilder();

const EdgeTxRelease = builder.simpleObject("EdgeTxRelease", {
  fields: (t) => ({
    id: t.id(),
    isPrerelease: t.boolean(),
    name: t.string(),
    description: t.string({ nullable: true }),
    assets: t.field({
      type: [
        builder.simpleObject("EdgeTxReleaseAsset", {
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

const EdgeTxPr = builder.simpleObject("EdgeTxPr", {
  fields: (t) => ({
    id: t.id(),
    name: t.string(),
    title: t.string(),
    description: t.string({ nullable: true }),
    headCommitId: t.string(),
  }),
});

const EdgeTxPrCommit = builder.simpleObject("EdgeTxPrCommit", {
  fields: (t) => ({
    id: t.id(),
  }),
});

const EdgeTxFirmwareTarget = builder.simpleObject("EdgeTxFirmwareTarget", {
  fields: (t) => ({
    id: t.id(),
    code: t.string(),
    name: t.string(),
    bundleUrl: t.string(),
  }),
});

const LocalEdgeTxFirmware = builder.simpleObject("LocalEdgeTxFirmware", {
  fields: (t) => ({
    id: t.id(),
    name: t.string(),
    base64Data: t.string(),
  }),
});

const EdgeTxFirmwareBundle = builder.simpleObject("EdgeTxFirmwareBundle", {
  fields: (t) => ({
    id: t.id(),
    url: t.string(),
  }),
});

builder.queryType({
  fields: (t) => ({
    edgeTxReleases: t.field({
      type: [EdgeTxRelease],
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
          assets: release.assets.map((asset) => ({
            id: asset.id.toString(),
            name: asset.name,
            url: asset.browser_download_url,
          })),
        }));
      },
    }),
    edgeTxRelease: t.field({
      type: EdgeTxRelease,
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
          id: pr.number,
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
      args: {
        id: t.arg.id({ required: true }),
      },
      resolve: async (_, { id }, { github }) => {
        const pr = (
          await github("GET /repos/{owner}/{repo}/pulls/{pull_number}", {
            owner: config.github.organization,
            repo: config.github.repos.firmware,
            pull_number: Number(id),
          })
        ).data;

        return {
          id: pr.number,
          name: pr.head.label,
          headCommitId: pr.head.sha,
          title: pr.title,
          description: pr.body ?? null,
        };
      },
    }),
    localFirmware: t.field({
      type: LocalEdgeTxFirmware,
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
  }),
});

builder.mutationType({
  fields: (t) => ({
    registerLocalFirmware: t.field({
      type: LocalEdgeTxFirmware,
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
  }),
});

builder.objectFields(EdgeTxRelease, (t) => ({
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

builder.objectFields(EdgeTxPr, (t) => ({
  commits: t.field({
    type: [EdgeTxPrCommit],
    resolve: async ({ id }, _, { github }) => {
      const commits = await github(
        "GET /repos/{owner}/{repo}/pulls/{pull_number}/commits",
        {
          repo: config.github.repos.firmware,
          owner: config.github.organization,
          per_page: 100,
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

builder.objectFields(EdgeTxPrCommit, (t) => ({
  firmwareBundle: t.field({
    type: EdgeTxFirmwareBundle,
    nullable: true,
    resolve: async ({ id }, _, { firmwareStore, github }) => {
      const firmwareAsset = await firmwareStore.fetchPrBuild(
        github,
        id.toString()
      );

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

builder.objectFields(EdgeTxFirmwareBundle, (t) => ({
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

builder.objectFields(EdgeTxFirmwareTarget, (t) => ({
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

export default {
  schema: builder.toSchema({}),
};
