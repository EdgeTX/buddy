import { mergeResolvers, mergeTypeDefs } from "@graphql-tools/merge";
import { mergeSchemas } from "@graphql-tools/schema";
import firmware from "./firmware";
import flash from "./flash";
import sdcard from "./sdcard";

export default {
  schema: mergeSchemas({ schemas: [firmware.schema] }),
  typeDefs: mergeTypeDefs([flash.typeDefs, sdcard.typeDefs]),
  resolvers: mergeResolvers([flash.resolvers, sdcard.resolvers]),
};
