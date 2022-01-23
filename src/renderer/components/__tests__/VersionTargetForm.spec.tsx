import React from "react";
import { render } from "test-utils/testing-library";
import VersionTargetForm from "renderer/components/VersionTargetForm";
import { fireEvent, screen } from "@testing-library/react";
import { jest } from "@jest/globals";
import snapshotDiff from "snapshot-diff";

const onChanged = jest.fn();

const getProps = ({
  selectedVersion = undefined as string | undefined,
  selectedTarget = undefined as string | undefined,
  filters = { includePrereleases: false },
  placeholders = false,
} = {}) => ({
  versions: {
    available: [
      {
        id: "some-versionid",
        name: "My first version",
      },
      {
        id: "some-versionid-2",
        name: "My second version",
      },
      {
        id: "some-versionid-3",
        name: "My third version",
      },
    ],
    selectedId: selectedVersion,
    placeholder: placeholders ? "Some placeholder for version" : undefined,
  },
  targets: {
    available: [
      {
        id: "some-targetid",
        name: "My first target",
      },
      {
        id: "some-targetid-2",
        name: "My second target",
      },
      {
        id: "some-targetid-3",
        name: "My third target",
      },
    ],
    selectedId: selectedTarget,
    placeholder: placeholders ? "Some placeholder for target" : undefined,
  },
  filters,
  onChanged,
});

describe("<VersionTargetForm />", () => {
  describe("version", () => {
    it("should allow the version to be selected from the available versions", async () => {
      render(<VersionTargetForm {...getProps()} />);

      fireEvent.keyDown(screen.getByLabelText("Firmware version"), {
        key: "Enter",
        code: 13,
        charCode: 13,
      });
      fireEvent.click(await screen.findByText("My second version"));

      expect(onChanged).toHaveBeenCalledWith({
        version: "some-versionid-2",
        filters: { includePrereleases: false },
        target: undefined,
      });
    });

    it("should show the selected version", () => {
      const { rerender } = render(
        <VersionTargetForm
          {...getProps({ selectedVersion: "some-versionid-3" })}
        />
      );
      expect(screen.getByText("My third version")).toBeVisible();

      rerender(
        <VersionTargetForm
          {...getProps({ selectedVersion: "some-versionid" })}
        />
      );
      expect(screen.getByText("My first version")).toBeVisible();
    });

    describe("filters", () => {
      it("should update filters if filters change", async () => {
        const { rerender } = render(
          <VersionTargetForm
            {...getProps({ filters: { includePrereleases: false } })}
          />
        );

        fireEvent.click(screen.getByText("Filters"));

        const prereleaseCheckbox = await screen.findByLabelText(
          "Include pre-releases"
        );

        expect(prereleaseCheckbox).not.toBeChecked();
        fireEvent.click(prereleaseCheckbox);

        expect(onChanged).toHaveBeenCalledWith({
          version: undefined,
          target: undefined,
          filters: { includePrereleases: true },
        });

        expect(prereleaseCheckbox).not.toBeVisible();

        rerender(
          <VersionTargetForm
            {...getProps({ filters: { includePrereleases: true } })}
          />
        );

        fireEvent.click(screen.getByText("Filters"));
        expect(
          await screen.findByLabelText("Include pre-releases")
        ).toBeChecked();
      });
    });
  });

  describe("targets", () => {
    it("should not allow targets to be selected unless version is selected", () => {
      render(
        <VersionTargetForm {...getProps({ selectedVersion: undefined })} />
      );

      expect(screen.getByLabelText("Radio model")).toBeDisabled();
    });

    it("should allow the target to to selected from a list of available targets", async () => {
      render(
        <VersionTargetForm
          {...getProps({ selectedVersion: "some-versionid" })}
        />
      );

      fireEvent.keyDown(screen.getByLabelText("Radio model"), {
        key: "Enter",
        code: 13,
        charCode: 13,
      });
      fireEvent.click(await screen.findByText("My first target"));

      expect(onChanged).toHaveBeenCalledWith({
        version: "some-versionid",
        filters: { includePrereleases: false },
        target: "some-targetid",
      });
    });

    it("should show the selected target", () => {
      const { rerender } = render(
        <VersionTargetForm
          {...getProps({
            selectedTarget: "some-targetid-2",
            selectedVersion: "some-versionid",
          })}
        />
      );
      expect(screen.getByText("My second target")).toBeVisible();

      rerender(
        <VersionTargetForm
          {...getProps({
            selectedTarget: "some-targetid-3",
            selectedVersion: "some-versionid",
          })}
        />
      );
      expect(screen.getByText("My third target")).toBeVisible();
    });
  });

  it("should render the version placeholder given", () => {
    const { rerender, asFragment } = render(
      <VersionTargetForm
        {...getProps({
          placeholders: false,
        })}
      />
    );

    const before = asFragment();

    rerender(
      <VersionTargetForm
        {...getProps({
          placeholders: true,
        })}
      />
    );

    expect(snapshotDiff(before, asFragment())).toMatchInlineSnapshot(`
      "Snapshot Diff:
      - First value
      + Second value

      @@ -52,11 +52,11 @@
                          />
                        </span>
                        <span
                          class=\\"ant-select-selection-placeholder\\"
                        >
      -                   Select firmware version
      +                   Some placeholder for version
                        </span>
                      </div>
                      <span
                        aria-hidden=\\"true\\"
                        class=\\"ant-select-arrow\\""
    `);
  });

  it("should render the target placeholder given", () => {
    const { rerender, asFragment } = render(
      <VersionTargetForm
        {...getProps({
          selectedVersion: "some-versionid",
          placeholders: false,
        })}
      />
    );

    const before = asFragment();

    rerender(
      <VersionTargetForm
        {...getProps({
          selectedVersion: "some-versionid",
          placeholders: true,
        })}
      />
    );

    expect(snapshotDiff(before, asFragment())).toMatchInlineSnapshot(`
      "Snapshot Diff:
      - First value
      + Second value

      @@ -176,11 +176,11 @@
                          />
                        </span>
                        <span
                          class=\\"ant-select-selection-placeholder\\"
                        >
      -                   Select radio model
      +                   Some placeholder for version
                        </span>
                      </div>
                      <span
                        aria-hidden=\\"true\\"
                        class=\\"ant-select-arrow\\""
    `);
  });
});
