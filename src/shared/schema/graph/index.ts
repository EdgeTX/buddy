import { mergeResolvers, mergeTypeDefs } from "@graphql-tools/merge";
import edgeTxReleases from "./edgeTxReleases";


export default {
  typeDefs: mergeTypeDefs([edgeTxReleases.typeDefs]),
  resolvers: mergeResolvers([edgeTxReleases.resolvers]),
};
