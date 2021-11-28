import gql from "graphql-tag";

const typeDefs = gql`
  type Query {
    removeableDevices: [RemoveableDevice!]!
  }

  type RemoveableDevice {
    id: ID!
    name: String!
  }
`;
