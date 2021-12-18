import { MockedResponse } from "@apollo/client/testing";
import gql from "graphql-tag";

// eslint-disable-next-line import/prefer-default-export
export const pickSdcardDirectoryMutation = (id?: string): MockedResponse => ({
  request: {
    query: gql`
      mutation PickSdcardDirectory {
        pickSdcardDirectory {
          id
        }
      }
    `,
  },
  result: {
    data: {
      pickSdcardDirectory: id
        ? {
            __typename: "SdcardDirectory",
            id,
          }
        : null,
    },
  },
});

export const sdcardInfoQuery = (
  directoryId: string,
  details?: { isValid: boolean; version?: string; target?: string }
): MockedResponse => ({
  request: {
    query: gql`
      query SdcardInfo($directoryId: ID!) {
        sdcardDirectory(id: $directoryId) {
          id
          isValid
          version
          target
        }
      }
    `,
    variables: {
      directoryId,
    },
  },
  result: {
    data: {
      sdcardDirectory: details
        ? {
            __typename: "SdcardDirectory",
            id: directoryId,
            target: null,
            version: null,
            ...details,
          }
        : null,
    },
  },
});
