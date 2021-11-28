import gql from "gql-tag";

const typeDefs = gql`
  type Mutation {
    createFlashJob(firmware: FlashFirmwareType!, deviceId: ID!): ID!
  }

  input FlashFirmwareType {
    version: ID!
    target: ID!
  }
`;
