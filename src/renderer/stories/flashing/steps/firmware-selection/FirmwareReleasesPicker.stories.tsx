import React from "react";
import { MockedProvider } from "@apollo/client/testing";
import FirmwareReleasesPicker from "renderer/pages/flash/steps/firmware/FirmwareReleasesPicker";
import { action } from "@storybook/addon-actions";
import { exampleReleasesList, exampleTargetsList } from "test-utils/data";
import { firmwaresQuery, targetsQuery } from "renderer/stories/flashing/mocks";

export default {
  title: "Flashing/steps/Firmware Selection/FirmwareReleasesPicker",
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

export const loadSuccessfully: React.FC<
  Parameters<typeof FirmwareReleasesPicker>
> = (args) => (
  <MockedProvider mocks={[firmwaresQuery, targetsQuery]}>
    <FirmwareReleasesPicker
      filters={{ includePrereleases: false }}
      onChanged={action("onChanged")}
      {...args}
    />
  </MockedProvider>
);

export const includePrereleases: React.FC<
  Parameters<typeof FirmwareReleasesPicker>
> = (args) => (
  <MockedProvider mocks={[firmwaresQuery, targetsQuery]}>
    <FirmwareReleasesPicker
      filters={{ includePrereleases: true }}
      onChanged={action("onChanged")}
      {...args}
    />
  </MockedProvider>
);

export const errorLoading: React.FC<
  Parameters<typeof FirmwareReleasesPicker>
> = (args) => (
  <MockedProvider mocks={[]}>
    <FirmwareReleasesPicker
      filters={{ includePrereleases: false }}
      onChanged={action("onChanged")}
      {...args}
    />
  </MockedProvider>
);
