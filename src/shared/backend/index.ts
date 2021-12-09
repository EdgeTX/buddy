import { makeExecutableSchema } from "@graphql-tools/schema";
import graph from "./graph";

export const schema = makeExecutableSchema(graph);
export { createContext, createMockContext } from "./context";
export * from "./types";
