import React from "react";
import { gql } from "@apollo/client";
import { MockedProvider } from "@apollo/client/testing";
import { screen } from "@testing-library/react";
import { render } from "test-utils/testing-library";
import CloudFirmwareReleasesPicker from "renderer/pages/flash/steps/firmware/CloudFirmwareReleasesPicker";

// Render the flags the picker passes down, so the test can check them
vi.mock("renderer/components/CloudVersionTargetForm", () => ({
  default: ({ flags }: { flags?: { id: string; values: string[] }[] }) => (
    <pre data-testid="flags">{flags ? JSON.stringify(flags) : ""}</pre>
  ),
}));

const cloudTargets = {
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
            excludeFlags {
              id
              values
            }
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
      cloudTargets: {
        releases: [
          {
            id: "nightly",
            name: "nightly",
            isPrerelease: true,
            timestamp: "2026-11-01T00:00:00Z",
            excludeTargets: [],
            excludeFlags: [],
          },
          {
            id: "v2.12.5",
            name: "v2.12.5",
            isPrerelease: false,
            timestamp: "2026-10-01T00:00:00Z",
            excludeTargets: [],
            excludeFlags: [
              { id: "language", values: ["AR"] },
              { id: "new_feature", values: ["YES"] },
            ],
          },
        ],
        targets: [{ id: "tx16s", name: "TX16S", tags: ["colorlcd"] }],
        flags: [
          { id: "language", values: ["EN", "FR"] },
          { id: "new_feature", values: ["YES"] },
        ],
        tags: [
          {
            id: "colorlcd",
            tagFlags: [{ id: "language", values: ["AR", "CN"] }],
          },
        ],
      },
    },
  },
};

const renderedFlags = async (): Promise<unknown> => {
  const el = await screen.findByTestId("flags");
  await vi.waitFor(() => expect(el.textContent).not.toBe(""));
  return JSON.parse(el.textContent ?? "") as unknown;
};

describe("<CloudFirmwareReleasesPicker />", () => {
  it("should hide the flag values the selected release excludes", async () => {
    render(
      <MockedProvider mocks={[cloudTargets]} addTypename={false}>
        <CloudFirmwareReleasesPicker
          onChanged={vi.fn()}
          filters={{ includePrereleases: false }}
          version="v2.12.5"
          target="tx16s"
        />
      </MockedProvider>
    );

    // AR is removed, and new_feature has no values left so it's dropped
    expect(await renderedFlags()).toEqual([
      { id: "language", values: ["EN", "FR", "CN"] },
    ]);
  });

  it("should offer all flag values for a release without exclusions", async () => {
    render(
      <MockedProvider mocks={[cloudTargets]} addTypename={false}>
        <CloudFirmwareReleasesPicker
          onChanged={vi.fn()}
          filters={{ includePrereleases: true }}
          version="nightly"
          target="tx16s"
        />
      </MockedProvider>
    );

    expect(await renderedFlags()).toEqual([
      { id: "language", values: ["EN", "FR", "AR", "CN"] },
      { id: "new_feature", values: ["YES"] },
    ]);
  });
});
