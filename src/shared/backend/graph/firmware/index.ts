import { mergeSchemas } from "@graphql-tools/schema";
import github from "./github";
import local from "./local";
import cloudbuild from "./cloudbuild";

export default {
  schema: mergeSchemas({
    schemas: [github.schema, local.schema, cloudbuild.schema],
  }),
};
