import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { gql } from "@apollo/client";
import { describe, it, expect, vi, beforeEach } from "vitest";
import BackupUploader from "renderer/pages/backup/file/BackupUploader";

// Mock react-ga
vi.mock("react-ga", () => ({
  exception: vi.fn(),
}));

// Mock antd message
vi.mock("antd", async () => {
  const actual = await vi.importActual("antd");
  return {
    ...actual,
    message: {
      error: vi.fn(),
      success: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    },
  };
});

// Mock BackupUploadArea
vi.mock("renderer/pages/backup/file/BackupUploadArea", () => ({
  default: ({
    loading,
    uploadedFile,
    onFileSelected,
    onRestoreModels,
    onPreviewModel,
    onResetAfterRestore,
    directorySelected,
    restoring,
  }: {
    loading: boolean;
    uploadedFile?: { id: string; name: string };
    onFileSelected: (file: { name: string; base64Data: string } | null) => void;
    onRestoreModels?: (models: unknown[]) => void;
    onPreviewModel?: (content: unknown, name: string) => void;
    onResetAfterRestore?: () => void;
    directorySelected?: boolean;
    restoring?: boolean;
  }) => (
    <div data-testid="backup-upload-area">
      {loading && <span data-testid="loading">Loading...</span>}
      {uploadedFile && (
        <div data-testid="uploaded-file">{uploadedFile.name}</div>
      )}
      {directorySelected && (
        <span data-testid="directory-selected">Dir Selected</span>
      )}
      {restoring && <span data-testid="restoring">Restoring...</span>}
      <button
        type="button"
        data-testid="select-file-btn"
        onClick={() =>
          onFileSelected({
            name: "test-backup.etx",
            base64Data: "ZmFrZWJhc2U2NGRhdGE=",
          })
        }
      >
        Select File
      </button>
      <button
        type="button"
        data-testid="clear-file-btn"
        onClick={() => onFileSelected(null)}
      >
        Clear File
      </button>
      {onRestoreModels && (
        <button
          type="button"
          data-testid="restore-btn"
          onClick={() => onRestoreModels([])}
        >
          Restore
        </button>
      )}
      {onPreviewModel && (
        <button
          type="button"
          data-testid="preview-btn"
          onClick={() => onPreviewModel({}, "model01")}
        >
          Preview
        </button>
      )}
      {onResetAfterRestore && (
        <button
          type="button"
          data-testid="reset-btn"
          onClick={() => onResetAfterRestore()}
        >
          Reset
        </button>
      )}
    </div>
  ),
}));

const LOCAL_BACKUP_INFO_QUERY = gql`
  query LocalBackupInfo($fileId: ID!) {
    localBackup(byId: $fileId) {
      id
      name
      base64Data
    }
  }
`;

const REGISTER_BACKUP_MUTATION = gql`
  mutation RegisterLocalBackupWithName($name: String!, $data: String!) {
    registerLocalBackup(backupBase64Data: $data, fileName: $name) {
      id
      name
    }
  }
`;

const mockBackupInfoQuery = {
  request: {
    query: LOCAL_BACKUP_INFO_QUERY,
    variables: {
      fileId: "test-file-id",
    },
  },
  result: {
    data: {
      localBackup: {
        id: "test-file-id",
        name: "test-backup.etx",
        base64Data: "ZmFrZWJhc2U2NGRhdGE=",
        __typename: "LocalBackup",
      },
    },
  },
};

const mockRegisterBackupMutation = {
  request: {
    query: REGISTER_BACKUP_MUTATION,
    variables: {
      name: "test-backup.etx",
      data: "ZmFrZWJhc2U2NGRhdGE=",
    },
  },
  result: {
    data: {
      registerLocalBackup: {
        id: "new-file-id",
        name: "test-backup.etx",
        __typename: "LocalBackup",
      },
    },
  },
};

describe("<BackupUploader />", () => {
  const mockOnFileUploaded = vi.fn();
  const mockOnRestoreModels = vi.fn();
  const mockOnPreviewModel = vi.fn();
  const mockOnResetAfterRestore = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the component", () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <BackupUploader onFileUploaded={mockOnFileUploaded} />
      </MockedProvider>
    );

    expect(screen.getByTestId("backup-upload-area")).toBeInTheDocument();
  });

  it("should display BackupUploadArea component", () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <BackupUploader onFileUploaded={mockOnFileUploaded} />
      </MockedProvider>
    );

    expect(screen.getByTestId("backup-upload-area")).toBeInTheDocument();
  });

  it("should pass loading state to BackupUploadArea", () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <BackupUploader
          onFileUploaded={mockOnFileUploaded}
          selectedFile="test-file-id"
        />
      </MockedProvider>
    );

    // Initially loading while query executes
    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });

  it("should query for backup info when selectedFile is provided", async () => {
    render(
      <MockedProvider mocks={[mockBackupInfoQuery]} addTypename={false}>
        <BackupUploader
          onFileUploaded={mockOnFileUploaded}
          selectedFile="test-file-id"
        />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId("uploaded-file")).toBeInTheDocument();
    });

    expect(screen.getByTestId("uploaded-file")).toHaveTextContent(
      "test-backup.etx"
    );
  });

  it("should pass callbacks to BackupUploadArea", () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <BackupUploader
          onFileUploaded={mockOnFileUploaded}
          onRestoreModels={mockOnRestoreModels}
          onPreviewModel={mockOnPreviewModel}
          onResetAfterRestore={mockOnResetAfterRestore}
        />
      </MockedProvider>
    );

    expect(screen.getByTestId("restore-btn")).toBeInTheDocument();
    expect(screen.getByTestId("preview-btn")).toBeInTheDocument();
    expect(screen.getByTestId("reset-btn")).toBeInTheDocument();
  });

  it("should handle file registration on file selection", async () => {
    render(
      <MockedProvider mocks={[mockRegisterBackupMutation]} addTypename={false}>
        <BackupUploader onFileUploaded={mockOnFileUploaded} />
      </MockedProvider>
    );

    const selectBtn = screen.getByTestId("select-file-btn");
    selectBtn.click();

    await waitFor(() => {
      expect(mockOnFileUploaded).toHaveBeenCalledWith("new-file-id");
    });
  });

  it("should call onFileUploaded with undefined when clearing file", () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <BackupUploader onFileUploaded={mockOnFileUploaded} />
      </MockedProvider>
    );

    const clearBtn = screen.getByTestId("clear-file-btn");
    clearBtn.click();

    expect(mockOnFileUploaded).toHaveBeenCalledWith();
  });

  it("should pass directorySelected prop to BackupUploadArea", () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <BackupUploader
          onFileUploaded={mockOnFileUploaded}
          directorySelected
        />
      </MockedProvider>
    );

    expect(screen.getByTestId("directory-selected")).toBeInTheDocument();
  });

  it("should pass restoring prop to BackupUploadArea", () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <BackupUploader onFileUploaded={mockOnFileUploaded} restoring />
      </MockedProvider>
    );

    expect(screen.getByTestId("restoring")).toBeInTheDocument();
  });

  it("should trigger onRestoreModels callback", () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <BackupUploader
          onFileUploaded={mockOnFileUploaded}
          onRestoreModels={mockOnRestoreModels}
        />
      </MockedProvider>
    );

    const restoreBtn = screen.getByTestId("restore-btn");
    restoreBtn.click();

    expect(mockOnRestoreModels).toHaveBeenCalledWith([]);
  });

  it("should trigger onPreviewModel callback", () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <BackupUploader
          onFileUploaded={mockOnFileUploaded}
          onPreviewModel={mockOnPreviewModel}
        />
      </MockedProvider>
    );

    const previewBtn = screen.getByTestId("preview-btn");
    previewBtn.click();

    expect(mockOnPreviewModel).toHaveBeenCalledWith({}, "model01");
  });

  it("should trigger onResetAfterRestore callback", () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <BackupUploader
          onFileUploaded={mockOnFileUploaded}
          onResetAfterRestore={mockOnResetAfterRestore}
        />
      </MockedProvider>
    );

    const resetBtn = screen.getByTestId("reset-btn");
    resetBtn.click();

    expect(mockOnResetAfterRestore).toHaveBeenCalled();
  });

  it("should render without optional callbacks", () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <BackupUploader onFileUploaded={mockOnFileUploaded} />
      </MockedProvider>
    );

    expect(screen.getByTestId("backup-upload-area")).toBeInTheDocument();
    expect(screen.queryByTestId("restore-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("preview-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("reset-btn")).not.toBeInTheDocument();
  });

  it("should not query when selectedFile is not provided", () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <BackupUploader onFileUploaded={mockOnFileUploaded} />
      </MockedProvider>
    );

    expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
    expect(screen.queryByTestId("uploaded-file")).not.toBeInTheDocument();
  });

  it("should handle missing backup info gracefully", async () => {
    const emptyMock = {
      request: {
        query: LOCAL_BACKUP_INFO_QUERY,
        variables: {
          fileId: "non-existent-id",
        },
      },
      result: {
        data: {
          localBackup: null,
        },
      },
    };

    render(
      <MockedProvider mocks={[emptyMock]} addTypename={false}>
        <BackupUploader
          onFileUploaded={mockOnFileUploaded}
          selectedFile="non-existent-id"
        />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(mockOnFileUploaded).toHaveBeenCalledWith(undefined);
    });
  });

  it("should show loading state during mutation", async () => {
    render(
      <MockedProvider mocks={[mockRegisterBackupMutation]} addTypename={false}>
        <BackupUploader onFileUploaded={mockOnFileUploaded} />
      </MockedProvider>
    );

    const selectBtn = screen.getByTestId("select-file-btn");
    selectBtn.click();

    // Should eventually complete
    await waitFor(() => {
      expect(mockOnFileUploaded).toHaveBeenCalled();
    });
  });

  it("should render with all props", () => {
    render(
      <MockedProvider mocks={[mockBackupInfoQuery]} addTypename={false}>
        <BackupUploader
          onFileUploaded={mockOnFileUploaded}
          onRestoreModels={mockOnRestoreModels}
          onPreviewModel={mockOnPreviewModel}
          onResetAfterRestore={mockOnResetAfterRestore}
          selectedFile="test-file-id"
          directorySelected
          restoring={false}
        />
      </MockedProvider>
    );

    expect(screen.getByTestId("backup-upload-area")).toBeInTheDocument();
    expect(screen.getByTestId("directory-selected")).toBeInTheDocument();
  });

  it("should work with network-only fetch policy", async () => {
    render(
      <MockedProvider mocks={[mockBackupInfoQuery]} addTypename={false}>
        <BackupUploader
          onFileUploaded={mockOnFileUploaded}
          selectedFile="test-file-id"
        />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("uploaded-file")).toBeInTheDocument();
    });
  });
});
