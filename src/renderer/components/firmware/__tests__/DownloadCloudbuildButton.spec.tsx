import nock from "nock";
import React from "react";
import download from "js-file-download";
import { MockedProvider } from "@apollo/client/testing";
import { fireEvent, screen } from "@testing-library/react";
import { createCloudFirmware } from "test-utils/mocks";
import { render } from "test-utils/testing-library";
import isUF2Payload from "shared/uf2/uf2";
import DownloadCloudbuildButton from "renderer/components/firmware/DownloadCloudbuildButton";

const mockDownload = vitest.mocked(download);

const fakeUF2Payload = () => new Uint32Array([0x0a324655, 0x9e5d5157]).buffer;

describe("<DownloadCloudbuildButton />", () => {
  // TODO: move to a UF2 specific test
  it("fake UF2 to be correct", () => {
    const payload = fakeUF2Payload();
    expect(isUF2Payload(payload)).toBe(true);
  });

  it("should download firmware when clicked", async () => {
    render(
      <MockedProvider
        mocks={[createCloudFirmware("v2.11.0", "st16", [], true)]}
      >
        <DownloadCloudbuildButton version="v2.11.0" target="st16">
          Download firmware
        </DownloadCloudbuildButton>
      </MockedProvider>
    );

    // Cloudbuild returns whatever download path it wants
    nock("https://test-cloudbuild.edgetx.org")
      .filteringPath(() => "/fake-build")
      .get("/fake-build")
      .reply(200, Buffer.from(fakeUF2Payload()));

    // Modal opens
    fireEvent.click(screen.getByText("Download firmware"));
    await screen.findByText("Firmware file saved");

    // Correct data + file extension
    expect(mockDownload).toHaveBeenCalledWith(
      fakeUF2Payload(),
      "v2.11.0-st16.uf2",
      "application/octet-stream"
    );
  });

  it("should wait while firmware is being built", async () => {
    render(
      <MockedProvider
        mocks={[createCloudFirmware("v2.11.0", "st16", [], false)]}
      >
        <DownloadCloudbuildButton version="v2.11.0" target="st16">
          Download firmware
        </DownloadCloudbuildButton>
      </MockedProvider>
    );

    // Modal opens
    fireEvent.click(screen.getByText("Download firmware"));

    // shows it's building
    await screen.findByText("Cloudbuild download");
    await screen.findByText("Building on server", { exact: false });
  });

  it("should display build errors", async () => {
    render(
      <MockedProvider
        mocks={[createCloudFirmware("v2.11.0", "st16", [], false, true)]}
      >
        <DownloadCloudbuildButton version="v2.11.0" target="st16">
          Download firmware
        </DownloadCloudbuildButton>
      </MockedProvider>
    );

    // Modal opens
    fireEvent.click(screen.getByText("Download firmware"));

    // shows error
    await screen.findByText("Cloudbuild download");
    await screen.findByText("Build failed");
  });

  it("should be disabled when disabled", () => {
    render(
      <MockedProvider mocks={[]}>
        <DownloadCloudbuildButton>Download firmware</DownloadCloudbuildButton>
      </MockedProvider>
    );

    expect(screen.getByRole("button")).toBeDisabled();
  });
});
