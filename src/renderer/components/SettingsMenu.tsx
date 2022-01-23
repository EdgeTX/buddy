import { Checkbox, Dropdown, Menu } from "antd";
import { CodeOutlined, SettingOutlined } from "@ant-design/icons";
import React from "react";
import { useSettings } from "renderer/settings";

const options = [
  { key: "expertMode", icon: <CodeOutlined />, text: "Expert mode" },
] as const;

const SettingsMenu: React.FC = () => {
  const [settings, setSettings] = useSettings();

  return (
    <Dropdown
      placement="bottomRight"
      trigger={["click"]}
      arrow
      overlay={
        <Menu>
          {options.map((option) => (
            <Menu.Item key={option.key} icon={option.icon}>
              <Checkbox
                checked={settings[option.key]}
                onChange={(e) =>
                  setSettings({ [option.key]: e.target.checked })
                }
              >
                {option.text}
              </Checkbox>
            </Menu.Item>
          ))}
        </Menu>
      }
    >
      <SettingOutlined
        style={{ fontSize: "16px", color: "white" }}
        title="settings"
      />
    </Dropdown>
  );
};

export default SettingsMenu;
