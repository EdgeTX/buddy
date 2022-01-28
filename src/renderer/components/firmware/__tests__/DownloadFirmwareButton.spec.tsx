import { MockedProvider } from "@apollo/client/testing";
import React from "react";
import { prBuildFirmwareDataQuery } from "test-utils/mocks";
import { render } from "test-utils/testing-library";
import DownloadFirmwareButton from "renderer/components/firmware/DownloadFirmwareButton";
import { examplePrs } from "test-utils/data";
import { encodePrVersion } from "shared/tools";
import download from "js-file-download";
import { mocked } from "jest-mock";
import { fireEvent, screen } from "@testing-library/react";

const mockDownload = mocked(download);
const prFirmware = examplePrs[0]!;

const toArrayBuffer = (b: Buffer) =>
  b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);

describe("<DownloadFirmwareButton />", () => {
  it("should download PR build firmware when clicked", async () => {
    render(
      <MockedProvider mocks={[prBuildFirmwareDataQuery]}>
        <DownloadFirmwareButton
          target="nv14"
          version={encodePrVersion({
            prId: prFirmware.id,
            commitId: prFirmware.headCommitId,
          })}
        >
          Download firmware
        </DownloadFirmwareButton>
      </MockedProvider>
    );

    fireEvent.click(screen.getByText("Download firmware"));

    await screen.findByText("Firmware file saved");

    expect(mockDownload).toHaveBeenCalledWith(
      toArrayBuffer(Buffer.from("some-data")),
      "nv14-217c02e.bin",
      "application/octet-stream"
    );
  });

  it("should be disabled when target and version are not given", () => {
    render(
      <MockedProvider mocks={[]}>
        <DownloadFirmwareButton>Download firmware</DownloadFirmwareButton>
      </MockedProvider>
    );

    expect(screen.getByRole("button")).toBeDisabled();
  });
});
