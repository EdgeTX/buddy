import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";

import ky from "ky-universal";


const TEST = '';
export default new ApolloClient({
  link: new HttpLink({
    uri: "https://api.github.com/graphql",
    headers: {
      authorization: `token ${process.env.GITHUB_TOKEN ?? TEST}`,
    },
    fetch: ky,
  }),
  cache: new InMemoryCache(),
});
