import { ApolloClient, InMemoryCache } from "@apollo/client";
import {
  pseudoBus,
  createPseudoBus,
  createPseudoBusLink,
} from "apollo-bus-link/pseudo";
import {
  createBusLinkBackend,
  createSchemaExecutor,
} from "apollo-bus-link/core";
import { context, schema } from "../../shared/schema";

const bus = createPseudoBus();

const executor = createBusLinkBackend({
  registerBus: pseudoBus(bus),
  executor: createSchemaExecutor({
    schema,
    context,
  }),
});

executor.listen();

const link = createPseudoBusLink(bus);

export default new ApolloClient({
  cache: new InMemoryCache(),
  link,
});
