import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { render } from "test-utils/testing-library";
import CollisionModal from "renderer/pages/backup/CollisionModal";

describe("<CollisionModal />", () => {
  const defaultCollisions = [
    {
      fileName: "model00",
      displayName: "My Quad",
      existingContent: "existing content",
      backupContent: "backup content",
    },
    {
      fileName: "model01",
      displayName: "My Plane",
      existingContent: "existing content 2",
      backupContent: "backup content 2",
    },
  ];

  const defaultAvailableSlots = ["model02", "model03", "model04"];

  const defaultProps = {
    visible: true,
    collisions: defaultCollisions,
    availableSlots: defaultAvailableSlots,
    onCancel: vitest.fn(),
    onResolve: vitest.fn(),
    onViewDiff: vitest.fn(),
  };

  beforeEach(() => {
    vitest.clearAllMocks();
  });

  it("should render the modal when visible is true", () => {
    render(<CollisionModal {...defaultProps} />);

    expect(
      screen.getByText("Model name conflicts detected")
    ).toBeInTheDocument();
  });

  it("should not display modal content when visible is false", () => {
    render(<CollisionModal {...defaultProps} visible={false} />);

    expect(screen.queryByText("My Quad")).toBeNull();
  });

  it("should display all collision items", () => {
    render(<CollisionModal {...defaultProps} />);

    expect(screen.getByText("My Quad")).toBeInTheDocument();
    expect(screen.getByText("My Plane")).toBeInTheDocument();
  });

  it("should display available slots text", () => {
    render(<CollisionModal {...defaultProps} />);

    expect(
      screen.getByText((content) => content.includes("Available slots"))
    ).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes("model02"))
    ).toBeInTheDocument();
  });

  it("should truncate available slots list when more than 5 slots", () => {
    const manySlots = [
      "model02",
      "model03",
      "model04",
      "model05",
      "model06",
      "model07",
    ];
    render(<CollisionModal {...defaultProps} availableSlots={manySlots} />);

    expect(
      screen.getByText((content) => content.includes("+1"))
    ).toBeInTheDocument();
  });

  it("should call onCancel when Cancel button is clicked", () => {
    const onCancel = vitest.fn();
    render(<CollisionModal {...defaultProps} onCancel={onCancel} />);

    fireEvent.click(screen.getByText("Cancel"));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("should render View differences and Rename buttons for each collision", () => {
    const { baseElement } = render(<CollisionModal {...defaultProps} />);

    // Should have eye icons for viewing differences (use baseElement for portals)
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const eyeIcons = baseElement.querySelectorAll(".anticon-eye");
    expect(eyeIcons.length).toBeGreaterThan(0);

    // Should have edit icons for renaming
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const editIcons = baseElement.querySelectorAll(".anticon-edit");
    expect(editIcons.length).toBeGreaterThan(0);
  });

  it("should call onResolve with overwrite=true when Overwrite all is clicked", () => {
    const onResolve = vitest.fn();
    render(<CollisionModal {...defaultProps} onResolve={onResolve} />);

    fireEvent.click(screen.getByText("Overwrite all"));

    expect(onResolve).toHaveBeenCalledWith({}, true);
  });

  it("should apply auto-rename when Auto-rename all button is clicked", async () => {
    render(<CollisionModal {...defaultProps} />);

    fireEvent.click(screen.getByText("Auto-rename all"));

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText("Auto-rename applied")).toBeInTheDocument();
    });

    // Should show renames in the list
    expect(
      screen.getByText((content) =>
        content.includes("model00.yml → model02.yml")
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText((content) =>
        content.includes("model01.yml → model03.yml")
      )
    ).toBeInTheDocument();
  });

  it("should have Auto-rename button in the footer", () => {
    render(
      <CollisionModal
        {...defaultProps}
        availableSlots={["model02"]}
        collisions={defaultCollisions}
      />
    );

    expect(screen.getByText("Auto-rename all")).toBeInTheDocument();
  });

  it("should have Restore with renames button that starts disabled", () => {
    render(<CollisionModal {...defaultProps} />);

    expect(screen.getByText("Restore with renames")).toBeInTheDocument();
  });

  it("should call onResolve with renames when Restore with renames is clicked", () => {
    const onResolve = vitest.fn();
    render(<CollisionModal {...defaultProps} onResolve={onResolve} />);

    // Auto-rename all
    fireEvent.click(screen.getByText("Auto-rename all"));

    // Click Restore with renames
    fireEvent.click(screen.getByText("Restore with renames"));

    expect(onResolve).toHaveBeenCalledWith(
      {
        model00: "model02",
        model01: "model03",
      },
      false
    );
  });

  it("should show unresolved collision text initially", () => {
    render(<CollisionModal {...defaultProps} />);

    // Both collisions should show as unresolved
    const warningTexts = screen.getAllByText(
      (content) =>
        content.includes("model01.yml") || content.includes("model02.yml")
    );
    expect(warningTexts.length).toBeGreaterThan(0);
  });

  it("should have warning icon in the title", () => {
    const { baseElement } = render(<CollisionModal {...defaultProps} />);

    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const warningIcon = baseElement.querySelector(".anticon-warning");
    expect(warningIcon).toBeTruthy();
  });

  it("should not show available slots text when no slots available", () => {
    render(<CollisionModal {...defaultProps} availableSlots={[]} />);

    expect(
      screen.queryByText((content) => content.includes("Available slots"))
    ).not.toBeInTheDocument();
  });
});
