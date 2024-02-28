import React from "react";
import { MemoryRouter } from "react-router-dom";
import FlashingWizard from "renderer/pages/flash/FlashingWizard";
import { openAntDropdown, render } from "test-utils/testing-library";
import { MockedProvider } from "@apollo/client/testing";
import {
  devicesQuery,
  firmwareReleaseDescriptionQuery,
  firmwaresQuery,
  targetsQuery,
} from "test-utils/mocks";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { exampleReleasesList, exampleTargetsList } from "test-utils/data";
import copy from "copy-text-to-clipboard";

const copyMock = vitest.mocked(copy);

const renderPage = (initialUrl = "/") =>
  render(
    <MockedProvider
      mocks={[
        firmwaresQuery(0),
        targetsQuery(0),
        firmwareReleaseDescriptionQuery(0),
        devicesQuery(0),
      ]}
    >
      <MemoryRouter initialEntries={[initialUrl]} initialIndex={1}>
        <FlashingWizard />
      </MemoryRouter>
    </MockedProvider>
  );

describe("pages/FlashingWizard", () => {
  describe("Selecting firmware", () => {
    it("should render the step as active", () => {
      renderPage();

      const stepIndicator = screen.getByTestId("step-indicator-0");
      expect(stepIndicator).toHaveClass("ant-steps-item-active");
      expect(stepIndicator).toHaveTextContent("Select a firmware");
    });

    describe("Cloud firmware", () => {
      const releases = exampleReleasesList.filter(
        (release) => !release.isPrerelease
      );
      const latestReleaseVersion = releases[0]!;
      const preReleases = exampleReleasesList.filter(
        (release) => release.isPrerelease
      );

      it("should be the default selected tab", () => {
        renderPage();

        expect(screen.getByRole("tab", { selected: true })).toHaveTextContent(
          "Cloud"
        );
      });

      it("should auto select the latest available firmware", async () => {
        renderPage();

        expect(
          await screen.findByText(latestReleaseVersion.name)
        ).toBeVisible();
        fireEvent.click(screen.getByText("Copy URL"));
        expect(copyMock).toHaveBeenCalledWith(
          `localhost:3000/#/?version=${latestReleaseVersion.id}`
        );
      });

      it("should render all releases and targets, and allow release and target to be selected", async () => {
        renderPage();

        const versionDropdown = screen.getByLabelText("Firmware version");
        await waitFor(() => expect(versionDropdown).toBeEnabled());

        // Open drop down
        openAntDropdown(versionDropdown);

        // wait for options to appear
        await screen.findByLabelText(releases[0]!.name);
        // verify options
        releases.forEach((release) =>
          expect(
            screen.getByText(release.name, {
              selector: ".ant-select-item-option-content",
            })
          ).toBeInTheDocument()
        );
        preReleases.forEach((release) => {
          expect(screen.queryByLabelText(release.name)).not.toBeInTheDocument();
        });

        // Click option we want
        fireEvent.click(screen.getByLabelText(latestReleaseVersion.name));
        // expect option to be selected
        expect(
          screen.getByText(latestReleaseVersion.name, {
            selector: ".ant-select-selection-item",
          })
        ).toBeVisible();

        const modelDropdown = screen.getByLabelText("Radio model");
        await waitFor(() => expect(modelDropdown).toBeEnabled());
        openAntDropdown(modelDropdown);

        await screen.findByText(exampleTargetsList[0]!.name, {
          selector: ".ant-select-item-option-content",
        });
        // verify options
        exampleTargetsList.forEach((target) => {
          expect(
            screen.getByText(target.name, {
              selector: ".ant-select-item-option-content",
            })
          ).toBeInTheDocument();
        });

        const target = exampleTargetsList[0]!;
        fireEvent.click(screen.getByText(target.name));
        expect(
          screen.getByText(target.name, {
            selector: ".ant-select-selection-item",
          })
        ).toBeVisible();

        fireEvent.click(screen.getByText("Copy URL"));
        expect(copyMock).toHaveBeenCalledWith(
          `localhost:3000/#/?version=${latestReleaseVersion.id}&target=${target.code}`
        );
      });

      it("should allow prerelease to be selected if filter is enabled", async () => {
        renderPage();

        const filtersDropdown = screen.getByText("Filters");

        fireEvent.click(filtersDropdown);
        fireEvent.click(screen.getByText("Include pre-releases"));

        const versionDropdown = screen.getByLabelText("Firmware version");
        await waitFor(() => expect(versionDropdown).toBeEnabled());
        openAntDropdown(versionDropdown);
        await screen.findByText(preReleases[0]!.name, {
          selector: ".ant-select-item-option-content",
        });

        preReleases.forEach((release) => {
          expect(
            screen.getByText(release.name, {
              selector: ".ant-select-item-option-content",
            })
          ).toBeInTheDocument();
        });

        const preRelease = preReleases[2]!;
        fireEvent.click(screen.getByText(preRelease.name));

        expect(
          screen.getByText(preRelease.name, {
            selector: ".ant-select-selection-item",
          })
        ).toBeVisible();

        fireEvent.click(screen.getByText("Copy URL"));
        expect(copyMock).toHaveBeenCalledWith(
          `localhost:3000/#/?version=${preRelease.id}`
        );
      });

      it("should pre select the version and target based off the URL and allow user to move to next page", async () => {
        const target = exampleTargetsList[3]!;

        renderPage(
          `/?version=${latestReleaseVersion.id}&target=${target.code}`
        );

        expect(
          await screen.findByText(latestReleaseVersion.name, {
            selector: ".ant-select-selection-item",
          })
        ).toBeVisible();
        expect(
          await screen.findByText(target.name, {
            selector: ".ant-select-selection-item",
          })
        ).toBeVisible();

        fireEvent.click(screen.getByText("Flash via USB"));

        const stepIndicator = screen.getByTestId("step-indicator-1");
        expect(stepIndicator).toHaveClass("ant-steps-item-active");
        expect(stepIndicator).toHaveTextContent("Connect radio");
      });

      it("should pre select the pre release version based off the URL", async () => {
        const release = preReleases[2]!;
        renderPage(`/?version=${release.id}`);

        expect(
          await screen.findByText(release.name, {
            selector: ".ant-select-selection-item",
          })
        ).toBeVisible();
      });
    });
  });
});
