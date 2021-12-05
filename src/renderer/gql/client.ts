import { ApolloClient, InMemoryCache } from "@apollo/client";
import { createWebWorkerBusLink } from "apollo-bus-link/webworker";
import worker from "../../webworker/webworker.bootstrap";

const link = createWebWorkerBusLink(worker);
link.initialiseBackend({});

export default new ApolloClient({
  cache: new InMemoryCache(),
  link,
});
