import React from "react";
import { render } from "test-utils/testing-library";
import { screen } from "@testing-library/react";
import BackupFileSummary from "renderer/components/backup/summary-variants/BackupFileSummary";

describe("<BackupFileSummary />", () => {
  it("should render the backup file name", () => {
    render(<BackupFileSummary name="my-backup.etx" />);

    expect(screen.getByText("my-backup.etx")).toBeInTheDocument();
  });

  it("should render the paper clip icon by default", () => {
    const { container } = render(<BackupFileSummary name="backup.etx" />);

    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const icon = container.querySelector(".anticon-paper-clip");
    expect(icon).toBeInTheDocument();
  });

  it("should hide the icon when hideIcon is true", () => {
    const { container } = render(
      <BackupFileSummary name="backup.etx" hideIcon />
    );

    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const icon = container.querySelector(".anticon-paper-clip");
    expect(icon).not.toBeInTheDocument();
  });

  it("should pass through additional Result props", () => {
    render(
      <BackupFileSummary name="my-backup.etx" subTitle="Created yesterday" />
    );

    expect(screen.getByText("my-backup.etx")).toBeInTheDocument();
    expect(screen.getByText("Created yesterday")).toBeInTheDocument();
  });

  it("should pass through status prop to Result component", () => {
    const { container } = render(
      <BackupFileSummary name="backup.etx" status="success" />
    );

    // Success status adds specific class to Result
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const resultDiv = container.querySelector(".ant-result-success");
    expect(resultDiv).toBeInTheDocument();
  });

  it("should apply padding style of 0", () => {
    const { container } = render(<BackupFileSummary name="test.etx" />);

    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const resultDiv = container.querySelector(".ant-result");
    expect(resultDiv).toHaveStyle({ padding: "0" });
  });

  it("should render with different file names", () => {
    const { rerender } = render(<BackupFileSummary name="backup1.etx" />);
    expect(screen.getByText("backup1.etx")).toBeInTheDocument();

    rerender(<BackupFileSummary name="my-radio-backup-2024.etx" />);
    expect(screen.getByText("my-radio-backup-2024.etx")).toBeInTheDocument();
  });

  it("should render with extra prop", () => {
    render(
      <BackupFileSummary
        name="backup.etx"
        extra={<button type="button">Download</button>}
      />
    );

    expect(screen.getByText("backup.etx")).toBeInTheDocument();
    expect(screen.getByText("Download")).toBeInTheDocument();
  });
});
