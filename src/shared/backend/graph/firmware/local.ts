import { createBuilder } from "shared/backend/utils/builder";

const builder = createBuilder();

const LocalEdgeTxFirmware = builder.simpleObject("LocalEdgeTxFirmware", {
  fields: (t) => ({
    id: t.id(),
    name: t.string(),
    base64Data: t.string(),
  }),
});

builder.queryType({
  fields: (t) => ({
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

export default {
  schema: builder.toSchema({}),
};
