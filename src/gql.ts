import { initGraphQLTada } from "gql.tada";
import type { introspection } from "graphql-env.d.ts";

export * from "gql.tada";

export default initGraphQLTada<{
  introspection: introspection;

  scalars: {
    ID: string;
  };
}>();

export type { FragmentOf, ResultOf, VariablesOf } from "gql.tada";
export { readFragment } from "gql.tada";
