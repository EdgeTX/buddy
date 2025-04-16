import { MockedProvider } from "@apollo/client/testing";
import React from "react";
import {
  firmwareReleaseInfoQuery,
  firmwarePrBuildInfoQuery,
  localFirmwareInfoQuery,
} from "test-utils/mocks";
import { render } from "test-utils/testing-library";
import FirmwareSummary from "renderer/components/firmware/FirmwareSummary";
import {
  examplePrs,
  exampleReleasesList,
  exampleTargetsList,
} from "test-utils/data";
import { screen } from "@testing-library/react";
import { encodePrVersion } from "shared/tools";
import snapshotDiff from "snapshot-diff";

const release = exampleReleasesList[1]!;
const releaseTarget = exampleTargetsList[3]!;

const pr = examplePrs[0]!;
const prTarget = exampleTargetsList[0]!;

describe("<FirmwareSummary />", () => {
  describe("Release firmware", () => {
    it("should render the version and target name of the firmware", async () => {
      render(
        <MockedProvider mocks={[firmwareReleaseInfoQuery(0)]}>
          <FirmwareSummary target="nv-14" version="v2.5.0" />
        </MockedProvider>
      );

      await screen.findByText(release.name);
      expect(screen.getByText(release.name)).toBeVisible();
      expect(screen.getByText(releaseTarget.name)).toBeVisible();
    });

    it("should not render the logo when hideIcon is set", async () => {
      render(
        <MockedProvider mocks={[firmwareReleaseInfoQuery(0)]}>
          <FirmwareSummary hideIcon target="nv-14" version="v2.5.0" />
        </MockedProvider>
      );
      await screen.findByText(release.name);
      expect(screen.queryByAltText("EdgeTX logo")).toBeFalsy();
    });
  });

  describe("PR Builds", () => {
    it("should render pr name, commit id, and target name", async () => {
      render(
        <MockedProvider mocks={[firmwarePrBuildInfoQuery(0)]}>
          <FirmwareSummary
            target="nv-14"
            version={
              encodePrVersion({
                prId: pr.id,
                commitId: pr.headCommitId,
              })!
            }
          />
        </MockedProvider>
      );

      await screen.findByText(pr.name);
      expect(screen.getByText(pr.name)).toBeVisible();
      expect(screen.getByText(pr.headCommitId.slice(0, 7))).toBeVisible();
      expect(screen.getByText(prTarget.name)).toBeVisible();
    });
  });

  describe("Local file", () => {
    it("should render the file name", async () => {
      render(
        <MockedProvider mocks={[localFirmwareInfoQuery(0)]}>
          <FirmwareSummary target="file-id-abcd" version="local" />
        </MockedProvider>
      );

      await screen.findByText("xlite-28cdb40.bin");
      expect(screen.getByText("xlite-28cdb40.bin")).toBeVisible();
    });
  });

  it("should render unknown firmware if details fail to load", async () => {
    render(
      <MockedProvider mocks={[]}>
        <FirmwareSummary target="file-id-abcd" version="local" />
      </MockedProvider>
    );

    await screen.findByText("Unknown firmware");
    expect(screen.getByText("Unknown firmware")).toBeVisible();
  });

  it("should render a skeleton whilst firmware info loads", async () => {
    const { asFragment } = render(
      <MockedProvider mocks={[firmwareReleaseInfoQuery(100)]}>
        <FirmwareSummary target="nv-14" version="v2.5.0" />
      </MockedProvider>
    );

    const before = asFragment();
    await screen.findByText(release.name);
    const after = asFragment();

    expect(snapshotDiff(before, after)).toMatchInlineSnapshot(`
      "Snapshot Diff:
      - First value
      + Second value

        <DocumentFragment>
      -   <div>
          <div
      -       class="sc-aXZVg cZVjIL"
      -       style="margin-bottom: 32px;"
      +     class="ant-space css-dev-only-do-not-override-1yacf91 ant-space-vertical ant-space-gap-row-large ant-space-gap-col-large"
      +     style="width: 100%;"
          >
            <div
      -         class="ant-skeleton ant-skeleton-element ant-skeleton-active css-dev-only-do-not-override-1yacf91"
      +       class="ant-space-item"
            >
      -         <span
      -           class="ant-skeleton-avatar ant-skeleton-avatar-lg ant-skeleton-avatar-square"
      -           style="height: 64px; width: 64px;"
      +       <div
      +         class="sc-aXZVg cZVjIL"
      +       >
      +         <img
      +           alt="EdgeTX logo"
      +           src="/src/renderer/assets/logo.webp"
      +           style="height: 64px;"
                />
              </div>
            </div>
            <div
      -       class="ant-skeleton ant-skeleton-active css-dev-only-do-not-override-1yacf91"
      +       class="ant-space-item"
            >
              <div
      -         class="ant-skeleton-content"
      +         class="sc-aXZVg cZVjIL"
              >
      -         <ul
      -           class="ant-skeleton-paragraph"
      +         <h5
      +           class="ant-typography css-dev-only-do-not-override-1yacf91"
      +           style="text-align: center;"
      +         >
      +           EdgeTX "Dauntless" 2.5.0
      +         </h5>
      +         <span
      +           class="ant-typography ant-typography-secondary css-dev-only-do-not-override-1yacf91"
      +           style="text-align: center;"
                >
      -           <li />
      -           <li
      -             style="width: 150px;"
      -           />
      -         </ul>
      +           Frsky Horus X12s
      +         </span>
              </div>
            </div>
          </div>
          )
        </DocumentFragment>"
    `);
  });
});
