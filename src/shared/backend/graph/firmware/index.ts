import { mergeSchemas } from "@graphql-tools/schema";
import github from "./github";
import local from "./local";
import cloudbuild from "./cloudbuild";
import splash from "./splash";

export default {
  schema: mergeSchemas({
    schemas: [github.schema, local.schema, cloudbuild.schema, splash.schema],
  }),
};
