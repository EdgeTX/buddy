import { mergeResolvers, mergeTypeDefs } from "@graphql-tools/merge";
import firmware from "./firmware";
import flash from "./flash";

export default {
  typeDefs: mergeTypeDefs([firmware.typeDefs, flash.typeDefs]),
  resolvers: mergeResolvers([firmware.resolvers, flash.resolvers]),
};
