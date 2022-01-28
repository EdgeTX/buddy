import { MockedProvider } from "@apollo/client/testing";
import React from "react";
import { firmwareReleaseInfoQuery } from "test-utils/mocks";
import { render } from "test-utils/testing-library";
import FirmwareSummary from "renderer/components/firmware/FirmwareSummary";
import { exampleReleasesList, exampleTargetsList } from "test-utils/data";
import { screen } from "@testing-library/react";

const release = exampleReleasesList[1]!;
const releaseTarget = exampleTargetsList[3]!;

describe("<FirmwareSummary />", () => {
  describe("with releases", () => {
    it("should render the version and target name of the firmware", async () => {
      render(
        <MockedProvider mocks={[firmwareReleaseInfoQuery(0)]}>
          <FirmwareSummary target="nv14" version="v2.5.0" />
        </MockedProvider>
      );

      await screen.findByText(release.name);
      expect(screen.getByText(release.name)).toBeVisible();
      expect(screen.getByText(releaseTarget.name)).toBeVisible();
    });
  });
});
