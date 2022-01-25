import { fireEvent, screen } from "@testing-library/react";
import React from "react";
import SettingsMenu from "renderer/components/SettingsMenu";
import { useSettings } from "renderer/settings";
import { render } from "test-utils/testing-library";

const ExpertModeTest: React.FC = () => {
  const [settings] = useSettings();

  return (
    <div>
      <SettingsMenu />
      {settings.expertMode && <div>Some expert mode area</div>}
    </div>
  );
};

beforeEach(() => {
  window.localStorage.clear();
});

describe("<SettingsMenu />", () => {
  it("should not show the menu until clicked", async () => {
    render(<ExpertModeTest />);
    expect(screen.queryByLabelText("Expert mode")).toBeFalsy();

    fireEvent.click(screen.getByTitle("settings"));
    await screen.findByLabelText("Expert mode");
  });

  it("should update the expert mode setting when clicked", async () => {
    render(<ExpertModeTest />);

    expect(screen.queryByText("Some expert mode area")).toBeFalsy();

    fireEvent.click(screen.getByTitle("settings"));
    fireEvent.click(await screen.findByLabelText("Expert mode"));

    expect(screen.getByText("Some expert mode area")).toBeVisible();
  });
});
