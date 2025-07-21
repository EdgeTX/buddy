// src/renderer/pages/sdcard/__tests__/SelectSdcardScreen.spec.tsx
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { MockedProvider, MockedResponse } from "@apollo/client/testing";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { gql } from "@apollo/client";
import { vi } from "vitest";
import SelectSdcardScreen from "renderer/pages/sdcard/SelectSdcardScreen";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("shared/environment", () => ({
  default: {
    isElectron: false,
  },
}));

vi.mock("renderer/compatibility/checks", () => ({
  default: {
    hasFilesystemApi: true,
  },
}));

const PICK_SDCARD_DIRECTORY = gql`
  mutation PickSdcardDirectory {
    pickSdcardDirectory {
      id
    }
  }
`;

const createSuccessfulMock = (
  directoryId = "test-directory-id"
): MockedResponse => ({
  request: {
    query: PICK_SDCARD_DIRECTORY,
  },
  result: {
    data: {
      pickSdcardDirectory: {
        id: directoryId,
      },
    },
  },
});

const renderComponent = (mocks: MockedResponse[] = [createSuccessfulMock()]) =>
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <MemoryRouter>
        <SelectSdcardScreen />
      </MemoryRouter>
    </MockedProvider>
  );

describe("SelectSdcardScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("UI Elements", () => {
    it("should render the warning alert", () => {
      renderComponent();
      expect(
        screen.getByText("The SD card editor is still in development")
      ).toBeInTheDocument();
    });

    it("should render the select SD card button", () => {
      renderComponent();
      expect(screen.getByText("Select SD Card")).toBeInTheDocument();
    });

    it("should render step icons", () => {
      renderComponent();
      expect(screen.getByRole("img", { name: "poweroff" })).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "usb" })).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "folder" })).toBeInTheDocument();
    });
  });

  describe("Button functionality", () => {
    it("should enable select button by default", () => {
      renderComponent();
      const selectButton = screen.getByText("Select SD Card");
      expect(selectButton).not.toBeDisabled();
    });

    it("should render select button as button element", () => {
      renderComponent();
      expect(
        screen.getByRole("button", { name: "Select SD Card" })
      ).toBeInTheDocument();
    });
  });

  describe("Directory selection", () => {
    it("should call mutation when select button is clicked", async () => {
      const mockMutation = createSuccessfulMock();
      renderComponent([mockMutation]);

      fireEvent.click(screen.getByText("Select SD Card"));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/sdcard/test-directory-id");
      });
    });

    it("should navigate to correct path with returned directory ID", async () => {
      const customDirectoryId = "custom-dir-123";
      const mockMutation = createSuccessfulMock(customDirectoryId);
      renderComponent([mockMutation]);

      fireEvent.click(screen.getByText("Select SD Card"));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          `/sdcard/${customDirectoryId}`
        );
      });
    });

    it("should handle null response from mutation", async () => {
      const nullMock: MockedResponse = {
        request: {
          query: PICK_SDCARD_DIRECTORY,
        },
        result: {
          data: {
            pickSdcardDirectory: null,
          },
        },
      };
      renderComponent([nullMock]);

      fireEvent.click(screen.getByText("Select SD Card"));

      await waitFor(
        () => {
          expect(mockNavigate).not.toHaveBeenCalled();
        },
        { timeout: 1000 }
      );
    });
  });

  describe("Layout and styling", () => {
    it("should render with proper layout structure", () => {
      renderComponent();
      expect(screen.getByText("Select SD Card")).toBeInTheDocument();
      expect(screen.getByText(/Step 1\./)).toBeInTheDocument();
      expect(screen.getByText(/Step 2\./)).toBeInTheDocument();
      expect(screen.getByText(/Step 3\./)).toBeInTheDocument();
    });
  });

  describe("Internationalization", () => {
    it("should use translation keys for all text", () => {
      renderComponent();
      expect(
        screen.getByText(/The SD card editor is still in development/)
      ).toBeInTheDocument();
      expect(screen.getByText("Select SD Card")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels and roles", () => {
      renderComponent();
      const selectButton = screen.getByRole("button", {
        name: "Select SD Card",
      });
      expect(selectButton).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "poweroff" })).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "usb" })).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "folder" })).toBeInTheDocument();
    });

    it("should support keyboard navigation", () => {
      renderComponent();
      const selectButton = screen.getByRole("button", {
        name: "Select SD Card",
      });
      selectButton.focus();
      expect(selectButton).toHaveFocus();
    });
  });
});
