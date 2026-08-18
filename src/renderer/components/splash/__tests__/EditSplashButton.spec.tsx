import nock from "nock";
import React from "react";
import { MockedProvider } from "@apollo/client/testing";
import { fireEvent, screen } from "@testing-library/react";
import {
  createCloudFirmware,
  splashCapabilityByTargetQuery,
  splashCapabilityByFirmwareQuery,
  registerLocalFirmwareForSplashMutation,
  releaseFirmwareDataForSplashQuery,
  firmwareSplashInfoQuery,
} from "test-utils/mocks";
import { render } from "test-utils/testing-library";
import EditSplashButton from "renderer/components/splash/EditSplashButton";

const monoCapability = {
  format: "mono-128x64",
  width: 128,
  height: 64,
  maxBytes: 1024,
};

const fakeFirmwareBytes = () => new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer;

describe("<EditSplashButton /> - CloudBuild flow", () => {
  it("builds via CloudBuild, registers the result locally, then opens the splash editor", async () => {
    render(
      <MockedProvider
        mocks={[
          splashCapabilityByTargetQuery("st16", monoCapability),
          createCloudFirmware("v2.11.0", "st16", [], true),
          registerLocalFirmwareForSplashMutation(
            "st16-v2.11.0.bin",
            Buffer.from(fakeFirmwareBytes()).toString("base64"),
            "patched-firmware-id"
          ),
          firmwareSplashInfoQuery("patched-firmware-id", {
            ...monoCapability,
            currentSplashBase64: null,
          }),
        ]}
      >
        <EditSplashButton
          activeTab="cloudbuild"
          version="v2.11.0"
          target="st16"
          onApplied={() => {}}
        />
      </MockedProvider>
    );

    // Splash capability is known statically, so the button appears without
    // needing to build anything first.
    await screen.findByRole("button", { name: /Edit splash screen/i });

    nock("https://test-cloudbuild.edgetx.org")
      .filteringPath(() => "/fake-build")
      .get("/fake-build")
      .reply(200, Buffer.from(fakeFirmwareBytes()));

    fireEvent.click(
      screen.getByRole("button", { name: /Edit splash screen/i })
    );

    // Build progress modal appears while the CloudBuild job + download run.
    await screen.findByText("Cloudbuild download");

    // Once the firmware is built, downloaded, and registered locally, the
    // build modal closes and the splash editor opens on the new firmware.
    await screen.findByText("Edit splash screen", {
      selector: ".ant-modal-title",
    });
    expect(screen.queryByText("Cloudbuild download")).not.toBeInTheDocument();

    // Origin was CloudBuild, not the Local file tab, so re-applying would
    // silently overwrite the original release/target selection with no
    // easy way back - "Apply and continue" must not be offered here.
    expect(
      screen.queryByRole("button", { name: /Apply and continue/i })
    ).not.toBeInTheDocument();
  });

  it("does not render when the CloudBuild target has no splash capability", () => {
    render(
      <MockedProvider mocks={[splashCapabilityByTargetQuery("tx16s", null)]}>
        <EditSplashButton
          activeTab="cloudbuild"
          version="v2.11.0"
          target="tx16s"
          onApplied={() => {}}
        />
      </MockedProvider>
    );

    expect(
      screen.queryByRole("button", { name: /Edit splash screen/i })
    ).not.toBeInTheDocument();
  });
});

describe("<EditSplashButton /> - GitHub releases flow", () => {
  it("eagerly fetches and registers the release firmware, then opens the splash editor", async () => {
    render(
      <MockedProvider
        mocks={[
          splashCapabilityByTargetQuery("x7", monoCapability),
          releaseFirmwareDataForSplashQuery(
            "v2.11.0",
            "x7",
            Buffer.from(fakeFirmwareBytes()).toString("base64")
          ),
          registerLocalFirmwareForSplashMutation(
            "x7-v2.11.0.bin",
            Buffer.from(fakeFirmwareBytes()).toString("base64"),
            "patched-firmware-id"
          ),
          firmwareSplashInfoQuery("patched-firmware-id", {
            ...monoCapability,
            currentSplashBase64: null,
          }),
        ]}
      >
        <EditSplashButton
          activeTab="releases"
          version="v2.11.0"
          target="x7"
          onApplied={() => {}}
        />
      </MockedProvider>
    );

    await screen.findByRole("button", { name: /Edit splash screen/i });
    fireEvent.click(
      screen.getByRole("button", { name: /Edit splash screen/i })
    );

    await screen.findByText("Edit splash screen", {
      selector: ".ant-modal-title",
    });

    // Origin was the GitHub tab, not the Local file tab, so "Apply and
    // continue" must not be offered here either.
    expect(
      screen.queryByRole("button", { name: /Apply and continue/i })
    ).not.toBeInTheDocument();
  });
});

describe("<EditSplashButton /> - Local file flow", () => {
  it("opens the splash editor directly, with Apply and continue available", async () => {
    render(
      <MockedProvider
        mocks={[
          splashCapabilityByFirmwareQuery("local-firmware-id", monoCapability),
          firmwareSplashInfoQuery("local-firmware-id", {
            ...monoCapability,
            currentSplashBase64: null,
          }),
        ]}
      >
        <EditSplashButton
          activeTab="file"
          target="local-firmware-id"
          onApplied={() => {}}
        />
      </MockedProvider>
    );

    await screen.findByRole("button", { name: /Edit splash screen/i });
    fireEvent.click(
      screen.getByRole("button", { name: /Edit splash screen/i })
    );

    await screen.findByText("Edit splash screen", {
      selector: ".ant-modal-title",
    });

    const applyButton = await screen.findByRole("button", {
      name: /Apply and continue/i,
    });
    expect(applyButton).toBeInTheDocument();
  });
});
