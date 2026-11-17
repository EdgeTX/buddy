import { mergeSchemas } from "@graphql-tools/schema";
import local from "./local";

export default {
  schema: mergeSchemas({
    schemas: [local.schema],
  }),
};
