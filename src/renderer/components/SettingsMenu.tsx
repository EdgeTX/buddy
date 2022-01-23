import { Checkbox, Dropdown, Menu } from "antd";
import { CodeOutlined, SettingOutlined } from "@ant-design/icons";
import React from "react";
import { useSettings } from "renderer/settings";

const SettingsMenu: React.FC = () => {
  const [settings, setSettings] = useSettings();

  return (
    <Dropdown
      placement="bottomRight"
      trigger={["click"]}
      arrow
      overlay={
        <Menu>
          <Menu.Item icon={<CodeOutlined />}>
            <Checkbox
              checked={settings.expertMode}
              onChange={(e) => setSettings({ expertMode: e.target.checked })}
            >
              Expert mode
            </Checkbox>
          </Menu.Item>
        </Menu>
      }
    >
      <SettingOutlined style={{ fontSize: "16px", color: "white" }} />
    </Dropdown>
  );
};

export default SettingsMenu;
