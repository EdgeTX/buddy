import { makeExecutableSchema } from "@graphql-tools/schema";
import graph from "./graph";

export const schema = makeExecutableSchema(graph);
export { context } from "./context";
