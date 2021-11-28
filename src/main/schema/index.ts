import { makeExecutableSchema } from '@graphql-tools/schema';
import graph from './graph';

const schema = makeExecutableSchema(graph);
