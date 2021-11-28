import gql from "graphql-tag";

const typeDefs = gql`
  type Query {
    sdcardReleases: [SdCardRelease!]!
  }

  type SdCardRelease {
    id: ID!
    name: String!
  }
`;
