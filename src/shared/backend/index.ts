import { makeExecutableSchema, mergeSchemas } from "@graphql-tools/schema";
import graph from "./graph";

export const schema = mergeSchemas({
  schemas: [graph.schema, makeExecutableSchema(graph)],
});
export { createContext } from "./context";
export * from "./types";
