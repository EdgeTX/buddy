import React from "react";
import { MockedProvider, MockedResponse } from "@apollo/client/testing";
import FirmwareReleasesPicker from "renderer/components/FirmwareReleasesPicker";
import { gql } from "@apollo/client";
import { action } from "@storybook/addon-actions";
import { exampleReleasesList, exampleTargetsList } from "test-utils/data";

export default {
  title: "Flashing/Firmware Selection/FirmwareReleasesPicker",
  component: FirmwareReleasesPicker,
  argTypes: {
    version: {
      options: exampleReleasesList.map((release) => release.id),
      control: { type: "select" },
    },
    target: {
      options: exampleTargetsList.map((target) => target.id),
      control: { type: "select" },
    },
  },
};

const firmwaresQuery: MockedResponse = {
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

const targetsQuery: MockedResponse = {
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

export const loadSuccessfully: React.FC<
  Parameters<typeof FirmwareReleasesPicker>
> = (args) => (
  <MockedProvider mocks={[firmwaresQuery, targetsQuery]}>
    <FirmwareReleasesPicker onChanged={action("onChanged")} {...args} />
  </MockedProvider>
);

export const errorLoading: React.FC<
  Parameters<typeof FirmwareReleasesPicker>
> = (args) => (
  <MockedProvider mocks={[]}>
    <FirmwareReleasesPicker onChanged={action("onChanged")} {...args} />
  </MockedProvider>
);
