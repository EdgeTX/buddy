import { MockedResponse } from "@apollo/client/testing";
import gql from "graphql-tag";
import { exampleReleasesList, exampleTargetsList } from "test-utils/data";

export const firmwaresQuery: MockedResponse = {
  request: {
    query: gql`
      query Releases {
        edgeTxReleases {
          id
          name
          isPrerelease
        }
      }
    `,
  },
  result: {
    data: {
      edgeTxReleases: exampleReleasesList,
    },
  },
  delay: 100,
};

export const targetsQuery: MockedResponse = {
  request: {
    query: gql`
      query ReleaseTargets($releaseId: ID!) {
        edgeTxRelease(id: $releaseId) {
          id
          firmwareBundle {
            id
            targets {
              id
              name
            }
          }
        }
      }
    `,
    variables: {
      releaseId: "v2.5.0",
    },
  },
  result: {
    data: {
      edgeTxRelease: {
        id: "",
        firmwareBundle: {
          id: "",
          targets: exampleTargetsList,
        },
      },
    },
  },
  delay: 1000,
};

export const registerTarget: MockedResponse = {
  request: {
    query: gql`
      mutation RegisterLocalFirmwareWithName($name: String!, $data: String!) {
        registerLocalFirmware(firmwareBase64Data: $data, fileName: $name) {
          id
        }
      }
    `,
  },
};
