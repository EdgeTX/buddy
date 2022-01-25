import React from "react";
import { MockedProvider } from "@apollo/client/testing";
import { action } from "@storybook/addon-actions";
import {
  firmwareReleaseDescriptionQuery,
  prCommitBuildNotAvailableQuery,
  prCommitBuildQuery,
  prCommitsQuery,
  prDescriptionQuery,
  prsQuery,
} from "test-utils/mocks";
import FirmwarePrBuildPicker from "renderer/pages/dev/flash/components/FirmwarePrBuildPicker";
import { encodePrVersion } from "shared/tools";
import {
  examplePrCommits,
  examplePrs,
  exampleTargetsList,
} from "test-utils/data";

export default {
  title: "Flashing/dev/PR Builds/FirmwarePrBuildPicker",
  component: FirmwarePrBuildPicker,
};

const mocks = [
  firmwareReleaseDescriptionQuery,
  prCommitBuildNotAvailableQuery,
  prCommitBuildQuery,
  prsQuery,
  prDescriptionQuery,
  prCommitsQuery,
];

export const loadSuccessfully: React.FC = () => (
  <MockedProvider mocks={mocks}>
    <FirmwarePrBuildPicker onChanged={action("onChanged")} />
  </MockedProvider>
);

export const prSelected: React.FC = () => (
  <MockedProvider mocks={mocks}>
    <FirmwarePrBuildPicker
      version={encodePrVersion({ prId: examplePrs[0]?.id })}
      onChanged={action("onChanged")}
    />
  </MockedProvider>
);

export const commitSelected: React.FC = () => (
  <MockedProvider mocks={mocks}>
    <FirmwarePrBuildPicker
      version={encodePrVersion({
        prId: examplePrs[0]?.id,
        commitId: examplePrs[0]?.headCommitId,
      })}
      onChanged={action("onChanged")}
    />
  </MockedProvider>
);

export const targetNotAvailable: React.FC = () => (
  <MockedProvider mocks={mocks}>
    <FirmwarePrBuildPicker
      version={encodePrVersion({
        prId: examplePrs[0]?.id,
        commitId: examplePrCommits[1]?.id,
      })}
      onChanged={action("onChanged")}
    />
  </MockedProvider>
);

export const targetSelected: React.FC = () => (
  <MockedProvider mocks={mocks}>
    <FirmwarePrBuildPicker
      version={encodePrVersion({
        prId: examplePrs[0]?.id,
        commitId: examplePrs[0]?.headCommitId,
      })}
      target={exampleTargetsList[2]?.id}
      onChanged={action("onChanged")}
    />
  </MockedProvider>
);

export const errorLoading: React.FC = () => (
  <MockedProvider mocks={[]}>
    <FirmwarePrBuildPicker onChanged={action("onChanged")} />
  </MockedProvider>
);
