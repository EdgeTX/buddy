import { mergeResolvers, mergeTypeDefs } from "@graphql-tools/merge";
import edgeTxReleases from "./firmware";

export default {
  typeDefs: mergeTypeDefs([edgeTxReleases.typeDefs]),
  resolvers: mergeResolvers([edgeTxReleases.resolvers]),
};
