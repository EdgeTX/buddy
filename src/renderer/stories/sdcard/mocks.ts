import { MockedResponse } from "@apollo/client/testing";
import gql from "graphql-tag";
import { exampleTargetsList } from "test-utils/data";

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

export const sdcardAssetInfoQuery = (
  directoryId: string,
  details: { version?: string; target?: string; sounds: string[] }
): MockedResponse => ({
  request: {
    query: gql`
      query SdcardAssetInfo($directoryId: ID!) {
        sdcardDirectory(id: $directoryId) {
          id
          name
          version
          target
          sounds
        }
      }
    `,
    variables: {
      directoryId,
    },
  },
  result: {
    data: {
      sdcardDirectory: {
        __typename: "SdcardDirectory",
        id: directoryId,
        target: null,
        version: null,
        ...details,
      },
    },
  },
});

export const sdcardPacksQuery: MockedResponse = {
  request: {
    query: gql`
      query SdcardPacks {
        edgeTxSdcardPackReleases {
          id
          name
          isPrerelease
          targets {
            id
            name
          }
        }
      }
    `,
  },
  result: {
    data: {
      edgeTxSdcardPackReleases: [
        {
          id: "v2.5.0",
          name: "v2.5.0",
          isPrerelease: false,
          targets: exampleTargetsList,
        },
      ],
    },
  },
};
