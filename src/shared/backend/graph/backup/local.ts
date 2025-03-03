import { createBuilder } from "shared/backend/utils/builder";

const builder = createBuilder();

const LocalEdgeTxBackup = builder.simpleObject("LocalEdgeTxBackup", {
  fields: (t) => ({
    id: t.id(),
    name: t.string(),
    base64Data: t.string(),
  }),
});

builder.queryType({
  fields: (t) => ({
    localBackup: t.field({
      type: LocalEdgeTxBackup,
      nullable: true,
      args: {
        byId: t.arg.id({ required: true }),
      },
      resolve: (_, { byId }, { backupStore }) => {
        const file = backupStore.getLocalBackupById(byId.toString());

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
    registerLocalBackup: t.field({
      type: LocalEdgeTxBackup,
      args: {
        fileName: t.arg.string({
          required: false,
        }),
        backupBase64Data: t.arg.string({ required: true }),
      },
      resolve: (_, { fileName, backupBase64Data }, { backupStore }) => {
        const id = backupStore.registerBackup(
          Buffer.from(backupBase64Data, "base64"),
          fileName ?? undefined
        );

        return { id, name: fileName ?? id, base64Data: backupBase64Data };
      },
    }),
  }),
});

export default {
  schema: builder.toSchema({}),
};
