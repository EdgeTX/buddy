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
        __typename: "EdgeTxRelease",
        id: "v2.5.0",
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
  delay: 2000,
  result: {
    data: {
      edgeTxRelease: {
        __typename: "EdgeTxRelease",
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
  delay: 2000,
  result: {
    data: {
      flashableDevices: exampleDevices,
    },
  },
};

export const deviceQuery: MockedResponse = {
  request: {
    query: gql`
      query DeviceInfo($deviceId: ID!) {
        flashableDevice(id: $deviceId) {
          id
          productName
          serialNumber
          vendorId
          productId
        }
      }
    `,
    variables: {
      deviceId: "1",
    },
  },
  delay: 2000,
  result: {
    data: {
      flashableDevice: exampleDevices[4],
    },
  },
};

export const firmwareReleaseInfoQuery: MockedResponse = {
  request: {
    query: gql`
      query ReleaseInfo($version: ID!, $target: ID!) {
        edgeTxRelease(id: $version) {
          id
          name
          firmwareBundle {
            id
            target(id: $target) {
              id
              name
            }
          }
        }
      }
    `,
    variables: {
      version: "v2.5.0",
      target: "nv-14",
    },
  },
  result: {
    data: {
      edgeTxRelease: {
        ...exampleReleasesList[0],
        firmwareBundle: {
          id: "",
          target: exampleTargetsList[3],
        },
      },
    },
  },
  delay: 1000,
};

export const flashJobQuery = (
  jobId: string,
  error?: boolean,
  completed?: boolean
): MockedResponse => ({
  request: {
    query: gql`
      query FlashJobStatus($jobId: ID!) {
        flashJobStatus(jobId: $jobId) {
          id
          cancelled
          meta {
            firmware {
              target
              version
            }
            deviceId
          }
          stages {
            connect {
              ...FlashJobStageData
            }
            build {
              ...FlashJobStageData
            }
            download {
              ...FlashJobStageData
            }
            erase {
              ...FlashJobStageData
            }
            flash {
              ...FlashJobStageData
            }
          }
        }
      }

      fragment FlashJobStageData on FlashStage {
        started
        completed
        progress
        error
      }
    `,
    variables: {
      jobId,
    },
  },
  result: {
    data: {
      flashJobStatus: {
        id: jobId,
        cancelled: false,
        meta: {
          firmware: {
            version: "v2.5.0",
            target: "nv-14",
          },
          deviceId: "some-device-id",
        },
        stages: {
          connect: {
            started: true,
            progress: 0,
            completed: true,
          },
          download: {
            started: true,
            progress: 100,
            completed: true,
          },
          erase: {
            started: true,
            progress: 70.2,
            error: error ? "Some error" : null,
            completed: completed ?? false,
          },
          flash: {
            started: completed ?? false,
            progress: 0,
            completed: completed ?? false,
          },
        },
      },
    },
  },
});
