import React from "react";
import { render } from "test-utils/testing-library";
import { screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import CloudVersionTargetForm from "renderer/components/CloudVersionTargetForm";

const mockOnChanged = vi.fn();
const mockUpdateSelectedFlags = vi.fn();
const mockUpdateFilters = vi.fn();

const mockProps = {
  onChanged: mockOnChanged,
  updateSelectedFlags: mockUpdateSelectedFlags,
  updateFilters: mockUpdateFilters,
  disabled: false,
  filters: { includePrereleases: false },
  versions: {
    selectedId: undefined,
    available: [
      { id: "v1.0", name: "Version 1.0" },
      { id: "v2.0", name: "Version 2.0" },
    ],
    loading: false,
    error: false,
    tooltip: "Select a firmware version",
    placeholder: "Choose a version",
  },
  targets: {
    selectedId: undefined,
    available: [
      { id: "t1", name: "Target 1" },
      { id: "t2", name: "Target 2" },
    ],
    loading: false,
    error: false,
    tooltip: "Select a target",
    placeholder: "Choose a target",
  },
  flags: [
    { id: "flag1", values: ["value1", "value2"] },
    { id: "flag2", values: ["value3", "value4"] },
  ],
  selectedFlags: [],
};

describe("CloudVersionTargetForm", () => {
  test("renders form elements correctly", () => {
    render(<CloudVersionTargetForm {...mockProps} />);

    expect(screen.getByLabelText("Firmware version")).toBeInTheDocument();
    expect(screen.getByLabelText("Radio model")).toBeInTheDocument();
    expect(screen.getByText("Flags")).toBeInTheDocument();
  });

  test("selecting a firmware version triggers onChanged", () => {
    render(<CloudVersionTargetForm {...mockProps} />);
    const select = screen.getByRole("combobox", { name: /firmware version/i });
    fireEvent.mouseDown(select);
    fireEvent.click(screen.getByText("Version 1.0"));
    expect(mockOnChanged).toHaveBeenCalledWith(
      expect.objectContaining({ version: "v1.0" })
    );
  });

  test("disables target selection when no version is selected", () => {
    render(<CloudVersionTargetForm {...mockProps} />);
    const targetSelect = screen.getByRole("combobox", { name: /radio model/i });
    expect(targetSelect).toBeDisabled();
  });

  test("adding a flag triggers form change", () => {
    render(<CloudVersionTargetForm {...mockProps} />);
    fireEvent.click(screen.getByText("Add flag"));
    expect(screen.getAllByRole("combobox")).toHaveLength(4); // Two dropdowns for flag & value
  });

  // Texts of the options in the open dropdown, in display order. Testing
  // Library queries don't expose antd's rendered option order.
  const openOptions = (): string[] =>
    Array.from(
      // eslint-disable-next-line testing-library/no-node-access
      document.querySelectorAll(
        ".ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option-content"
      )
    ).map((el) => el.textContent ?? "");

  test("lists flag names in natural order", () => {
    render(
      <CloudVersionTargetForm
        {...mockProps}
        flags={[
          { id: "pxx2", values: ["YES"] },
          { id: "language", values: ["EN"] },
          { id: "afhds3", values: ["YES"] },
          { id: "pxx1", values: ["YES"] },
        ]}
      />
    );
    fireEvent.click(screen.getByText("Add flag"));
    const [, , flagSelect] = screen.getAllByRole("combobox");
    fireEvent.mouseDown(flagSelect as HTMLElement);
    expect(openOptions()).toEqual(["afhds3", "language", "pxx1", "pxx2"]);
  });

  test("lists flag values in natural order", () => {
    render(
      <CloudVersionTargetForm
        {...mockProps}
        // global values followed by the ones a colorlcd tag adds
        flags={[
          { id: "language", values: ["EN", "FR", "X10", "AR", "CN", "X9"] },
        ]}
        selectedFlags={[{ name: "language", value: "" }]}
      />
    );
    const [, , , valueSelect] = screen.getAllByRole("combobox");
    fireEvent.mouseDown(valueSelect as HTMLElement);
    expect(openOptions()).toEqual(["AR", "CN", "EN", "FR", "X9", "X10"]);
  });
});
