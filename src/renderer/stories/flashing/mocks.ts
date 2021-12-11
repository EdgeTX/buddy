import { MockedResponse } from "@apollo/client/testing";
import gql from "graphql-tag";
import { times } from "shared/tools";
import {
  exampleDevices,
  exampleReleasesList,
  exampleTargetsList,
} from "test-utils/data";

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

const releaseDescription = times(10)
  .map(
    () => `
My release, it is great, it has lots of things.

- This thing
- and this
- and this.

[View it here](https://google.com)
`
  )
  .join("");

export const firmwareReleaseDescriptionQuery: MockedResponse = {
  request: {
    query: gql`
      query FirmwareReleaseDescription($releaseId: ID!) {
        edgeTxRelease(id: $releaseId) {
          id
          description
        }
      }
    `,
    variables: {
      releaseId: "v2.5.0",
    },
  },
  delay: 200,
  result: {
    data: {
      edgeTxRelease: {
        id: "v2.5.0",
        description: releaseDescription,
      },
    },
  },
};

export const devicesQuery: MockedResponse = {
  request: {
    query: gql`
      query Devices {
        flashableDevices {
          id
          productName
          serialNumber
          vendorId
          productId
        }
      }
    `,
  },
  delay: 200,
  result: {
    data: {
      flashableDevices: exampleDevices,
    },
  },
};
