import { makeExecutableSchema, mergeSchemas } from "@graphql-tools/schema";
import graph from "./graph";

export default mergeSchemas({
  schemas: [graph.schema, makeExecutableSchema(graph)],
});
