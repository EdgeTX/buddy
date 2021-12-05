import { makeExecutableSchema } from "@graphql-tools/schema";
import graph from "./graph";

export const schema = makeExecutableSchema(graph);
export { createContext } from "./context";
