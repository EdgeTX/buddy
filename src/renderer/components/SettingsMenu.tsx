import { Checkbox, Dropdown, Menu, Select } from "antd";
import {
  CodeOutlined,
  SettingOutlined,
  TranslationOutlined,
} from "@ant-design/icons";
import React, { useState } from "react";
import { useSettings } from "renderer/settings";
import { useTranslation } from "react-i18next";
import languages from "renderer/i18n/languages";
import useIsoNames from "renderer/hooks/useIsoNames";

const options = [
  { key: "expertMode", icon: <CodeOutlined />, text: "Expert mode" },
] as const;

const SettingsMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useSettings();
  const { i18n } = useTranslation();
  const availableLanguages = useIsoNames(languages);

  return (
    <Dropdown
      placement="bottomRight"
      trigger={["click"]}
      visible={open}
      onVisibleChange={setOpen}
      arrow
      overlay={
        <Menu onClick={() => {}}>
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
          <Menu.Item key="language" icon={<TranslationOutlined />}>
            <Select
              style={{ width: "100%" }}
              value={i18n.language}
              onChange={(newLanguage) => {
                void i18n.changeLanguage(newLanguage);
              }}
            >
              {availableLanguages.map(({ id, name }) => (
                <Select.Option key={id} value={id}>
                  {name}
                </Select.Option>
              ))}
            </Select>
          </Menu.Item>
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
