import React from "react";
import { fireEvent, screen } from "@testing-library/react";
import { render } from "test-utils/testing-library";
import DiffViewerModal from "renderer/pages/backup/DiffViewerModal";

describe("<DiffViewerModal />", () => {
  const defaultProps = {
    visible: true,
    modelName: "model00",
    existingContent: `header:
  name: MyQuad
  labels: ""
timers:
  - mode: 0`,
    backupContent: `header:
  name: MyQuad
  labels: "acro"
timers:
  - mode: 1`,
    onClose: vitest.fn(),
  };

  beforeEach(() => {
    vitest.clearAllMocks();
  });

  it("should render the modal when visible is true", () => {
    render(<DiffViewerModal {...defaultProps} />);

    expect(screen.getByText(/Compare model versions/)).toBeInTheDocument();
  });

  it("should not render the modal content when visible is false", () => {
    render(<DiffViewerModal {...defaultProps} visible={false} />);

    // Modal content should not be in the document when closed (antd may leave wrapper)
    expect(screen.queryByText("Current version (on SD card)")).toBeNull();
  });

  it("should display the model name in the modal title", () => {
    const { baseElement } = render(
      <DiffViewerModal {...defaultProps} modelName="my-quad-racer" />
    );

    // Find the modal title element using baseElement (container for portals)
    // eslint-disable-next-line testing-library/no-node-access
    const modalTitle = baseElement.querySelector(".ant-modal-title");
    expect(modalTitle?.textContent).toContain("my-quad-racer");
  });

  it("should render both content panels", () => {
    render(<DiffViewerModal {...defaultProps} />);

    expect(
      screen.getByText("Current version (on SD card)")
    ).toBeInTheDocument();
    expect(screen.getByText("Backup version (to restore)")).toBeInTheDocument();
  });

  it("should display content in both panels", () => {
    render(<DiffViewerModal {...defaultProps} />);

    // Check that content is shown (appears in both panels)
    const nameElements = screen.getAllByText("name: MyQuad");
    expect(nameElements.length).toBe(2); // One in each panel
  });

  it("should display different content correctly", () => {
    render(<DiffViewerModal {...defaultProps} />);

    // Check that different labels are shown (one in each panel)
    expect(screen.getByText('labels: ""')).toBeInTheDocument();
    expect(screen.getByText('labels: "acro"')).toBeInTheDocument();
  });

  it("should show helper text about highlighted lines", () => {
    render(<DiffViewerModal {...defaultProps} />);

    expect(
      screen.getByText("Lines highlighted in red differ between versions")
    ).toBeInTheDocument();
  });

  it("should call onClose when OK button is clicked", () => {
    const onClose = vitest.fn();
    render(<DiffViewerModal {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByText("Close"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should have a Close button visible", () => {
    render(<DiffViewerModal {...defaultProps} />);

    // Check that the Close button exists
    expect(screen.getByText("Close")).toBeInTheDocument();
  });

  it("should handle empty content gracefully", () => {
    render(
      <DiffViewerModal {...defaultProps} existingContent="" backupContent="" />
    );

    // Modal should still render
    expect(screen.getByText(/Compare model versions/)).toBeInTheDocument();
  });

  it("should handle content with identical lines", () => {
    const sameContent = `header:
  name: SameName
  labels: ""`;

    render(
      <DiffViewerModal
        {...defaultProps}
        existingContent={sameContent}
        backupContent={sameContent}
      />
    );

    // Should render without errors - content appears in both panels
    const nameElements = screen.getAllByText("name: SameName");
    expect(nameElements.length).toBe(2);
  });

  it("should handle content with different number of lines", () => {
    render(
      <DiffViewerModal
        {...defaultProps}
        existingContent={`line1
line2
line3`}
        backupContent={`line1
line2`}
      />
    );

    // Should render without crashing - line3 only in existing content
    expect(screen.getByText("line3")).toBeInTheDocument();
  });
});
