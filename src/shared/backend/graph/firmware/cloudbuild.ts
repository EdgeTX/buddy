import { createBuilder } from "shared/backend/utils/builder";

const builder = createBuilder();

const Simple = builder.simpleObject("Simpler", {
  fields: (t) => ({
    bloup: t.string(),
  }),
});

builder.queryType({
  fields: (t) => ({
    simple: t.field({
      type: Simple,
      args: {
        name: t.arg.string(),
      },
      resolve: (_, { name }) => {
        return { bloup: name ?? "bloup bloup" };
      },
    }),
  }),
});

export default {
  schema: builder.toSchema({}),
};
