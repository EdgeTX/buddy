import { MockedResponse } from "@apollo/client/testing";
import gql from "graphql-tag";
import { times } from "shared/tools";
import {
  exampleCloudbuildTargets,
  exampleDevices,
  examplePrCommits,
  examplePrs,
  exampleReleasesList,
  exampleTargetsList,
} from "test-utils/data";

export const firmwaresQuery = (delay = 100): MockedResponse => ({
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
  delay,
});

export const targetsQuery = (delay = 1000): MockedResponse => ({
  request: {
    query: gql`
      query ReleaseTargets($releaseId: ID!) {
        edgeTxRelease(id: $releaseId) {
          id
          firmwareBundle {
            id
            targets {
              id
              code
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
  delay,
});

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

export const firmwareReleaseDescriptionQuery = (
  delay = 2000
): MockedResponse => ({
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
  delay,
  result: {
    data: {
      edgeTxRelease: {
        __typename: "EdgeTxRelease",
        id: "v2.5.0",
        description: releaseDescription,
      },
    },
  },
});

export const prsQuery: MockedResponse = {
  request: {
    query: gql`
      query EdgeTxPrs {
        edgeTxPrs {
          id
          name
          headCommitId
        }
      }
    `,
  },
  result: {
    data: {
      edgeTxPrs: examplePrs,
    },
  },
};

export const prCommitsQuery: MockedResponse = {
  request: {
    query: gql`
      query EdgeTxPrCommits($prId: ID!) {
        edgeTxPr(id: $prId) {
          id
          commits {
            id
          }
        }
      }
    `,
    variables: {
      prId: examplePrs[0]?.id,
    },
  },
  result: {
    data: {
      edgeTxPr: {
        __typename: "EdgeTxPr",
        id: examplePrs[0]?.id,
        commits: examplePrCommits,
      },
    },
  },
};

export const prCommitBuildQuery: MockedResponse = {
  request: {
    query: gql`
      query EdgeTxPrCommitBuild($prId: ID!, $commitId: ID!) {
        edgeTxPr(id: $prId) {
          id
          commit(id: $commitId) {
            id
            firmwareBundle {
              id
              targets {
                id
                code
                name
              }
            }
          }
        }
      }
    `,
    variables: {
      prId: examplePrs[0]?.id,
      commitId: examplePrs[0]?.headCommitId,
    },
  },
  result: {
    data: {
      edgeTxPr: {
        __typename: "EdgeTxPr",
        id: examplePrs[0]?.id,
        commit: {
          firmwareBundle: {
            id: "135237194",
            targets: exampleTargetsList,
          },
          id: examplePrs[0]?.headCommitId,
        },
      },
    },
  },
};

export const prCommitBuildNotAvailableQuery: MockedResponse = {
  request: {
    query: gql`
      query EdgeTxPrCommitBuild($prId: ID!, $commitId: ID!) {
        edgeTxPr(id: $prId) {
          id
          commit(id: $commitId) {
            id
            firmwareBundle {
              id
              targets {
                id
                code
                name
              }
            }
          }
        }
      }
    `,
    variables: {
      prId: examplePrs[0]?.id,
      commitId: examplePrCommits[1]?.id,
    },
  },
  result: {
    data: {
      edgeTxPr: {
        __typename: "EdgeTxPr",
        id: examplePrs[0]?.id,
        commit: {
          firmwareBundle: null,
          id: examplePrCommits[1]?.id,
        },
      },
    },
  },
};

export const prDescriptionQuery: MockedResponse = {
  request: {
    query: gql`
      query PrDescription($prId: ID!) {
        edgeTxPr(id: $prId) {
          id
          title
          description
        }
      }
    `,
    variables: {
      prId: examplePrs[0]?.id,
    },
  },
  result: {
    data: {
      edgeTxPr: {
        __typename: "EdgeTxPr",
        id: examplePrs[0]?.id,
        title: "Some pr title",
        description: "- My Pr description",
      },
    },
  },
};

export const devicesQuery = (
  delay = 2000,
  devices = exampleDevices
): MockedResponse => ({
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
  delay,
  result: {
    data: {
      flashableDevices: devices,
    },
  },
});

export const deviceQuery = (delay = 2000): MockedResponse => ({
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
  delay,
  result: {
    data: {
      flashableDevice: exampleDevices[4],
    },
  },
});

export const firmwareReleaseInfoQuery = (delay = 1000): MockedResponse => ({
  request: {
    query: gql`
      query ReleaseInfo($version: ID!, $target: ID!) {
        edgeTxRelease(id: $version) {
          id
          name
          firmwareBundle {
            id
            target(code: $target) {
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
        ...exampleReleasesList[1],
        firmwareBundle: {
          id: "",
          target: exampleTargetsList[3],
        },
      },
    },
  },
  delay,
});

export const localFirmwareInfoQuery = (delay = 1000): MockedResponse => ({
  request: {
    query: gql`
      query LocalFirmwareInfo($fileId: ID!) {
        localFirmware(byId: $fileId) {
          id
          name
        }
      }
    `,
    variables: {
      fileId: "file-id-abcd",
    },
  },
  result: {
    data: {
      localFirmware: {
        id: "",
        name: "xlite-28cdb40.bin",
      },
    },
  },
  delay,
});

export const firmwarePrBuildInfoQuery = (delay = 1000): MockedResponse => ({
  request: {
    query: gql`
      query PrFirmwareInfo($prId: ID!, $commitId: ID!, $target: ID!) {
        edgeTxPr(id: $prId) {
          id
          name
          commit(id: $commitId) {
            id
            firmwareBundle {
              id
              target(code: $target) {
                id
                name
              }
            }
          }
        }
      }
    `,
    variables: {
      prId: examplePrs[0]?.id,
      commitId: examplePrs[0]?.headCommitId,
      target: "nv-14",
    },
  },
  result: {
    data: {
      edgeTxPr: {
        id: "",
        name: examplePrs[0]?.name,
        commit: {
          id: examplePrs[0]?.headCommitId,
          firmwareBundle: {
            id: "",
            target: exampleTargetsList[0],
          },
        },
      },
    },
  },
  delay,
});

export const prBuildFirmwareDataQuery: MockedResponse = {
  request: {
    query: gql`
      query PrBuildFirmwareData($prId: ID!, $commitId: ID!, $target: ID!) {
        edgeTxPr(id: $prId) {
          id
          commit(id: $commitId) {
            id
            firmwareBundle {
              id
              target(code: $target) {
                id
                base64Data
              }
            }
          }
        }
      }
    `,
    variables: {
      prId: examplePrs[0]?.id,
      commitId: examplePrs[0]?.headCommitId,
      target: "nv14",
    },
  },
  result: {
    data: {
      edgeTxPr: {
        id: "32345345",
        commit: {
          id: examplePrs[0]?.headCommitId,
          firmwareBundle: {
            id: "349345",
            target: {
              id: "nv14",
              code: "nv14",
              base64Data: Buffer.from("some-data").toString("base64"),
            },
          },
        },
      },
    },
  },
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

export const cloudbuildTargets = (delay = 500): MockedResponse => ({
  request: {
    query: gql`
      query CloudTargets {
        cloudTargets {
          releases {
            id
            name
            isPrerelease
            timestamp
            excludeTargets
          }
          targets {
            id
            name
            tags
          }
          flags {
            id
            values
          }
          tags {
            id
            tagFlags {
              id
              values
            }
          }
        }
      }
    `,
  },
  result: {
    data: {
      cloudTargets: exampleCloudbuildTargets,
    },
  },
  delay,
});

const cloudbuildJobStatus = (
  release: string,
  target: string,
  flags: { name: string; value: string }[],
  build_finished?: boolean,
  error?: boolean,
  delay = 200
): MockedResponse => ({
  request: {
    query: gql`
      query CloudFirmwareStatus($params: CloudFirmwareParams!) {
        cloudFirmwareStatus(params: $params) {
          status
          downloadUrl
        }
      }
    `,
    variables: {
      params: {
        release,
        target,
        flags,
      },
    },
  },
  result: {
    data: {
      cloudFirmwareStatus: error
        ? { error: "build not found" }
        : {
            status: build_finished ? "BUILD_SUCCESS" : "BUILD_IN_PROGRESS",
            build_attempts: 1,
            artifacts: [
              {
                id: "4842244f-a1e4-4f43-93c8-8265e5951cfc",
                slug: "firmware",
                download_url: build_finished
                  ? "https://test-cloudbuild.edgetx.org/da28e356449e54c57f0e5e356bd5ec5709128ff7-fe4a260cd3251164f544654df3504a9c5d7f1e0b0d8a565941415ed4e9b8e042.bin"
                  : undefined,
                size: 492052,
                created_at: "2023-05-21T11:18:00.885181Z",
                updated_at: "2023-05-21T11:18:00.885181Z",
              },
            ],
            build_started_at: "2023-05-21T11:16:58.15048Z",
            build_ended_at: "2023-05-21T11:18:00.88349Z",
            created_at: "2023-05-21T11:16:57.877346Z",
            updated_at: "2023-05-21T11:18:00.884116Z",
          },
    },
  },
  delay,
});
