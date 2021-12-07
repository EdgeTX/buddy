import { mergeResolvers, mergeTypeDefs } from "@graphql-tools/merge";
import firmware from "./firmware";
import flash from "./flash";
import sdcard from "./sdcard";

export default {
  typeDefs: mergeTypeDefs([firmware.typeDefs, flash.typeDefs, sdcard.typeDefs]),
  resolvers: mergeResolvers([
    firmware.resolvers,
    flash.resolvers,
    sdcard.resolvers,
  ]),
};
