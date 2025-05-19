// src/renderer/pages/modelsSettings/tabs/ThemesListTab.tsx
import React from "react";
import { Space, Checkbox } from "antd";

export type ThemesListTabProps = {
  themes: string[];
  selected: string[];
  onToggle: (name: string, checked: boolean) => void;
};

const ThemesListTab: React.FC<ThemesListTabProps> = ({
  themes,
  selected,
  onToggle,
}) => (
  <Space direction="vertical" size="middle" style={{ width: "100%" }}>
    {themes.map((name) => (
      <Checkbox
        key={name}
        value={name}
        checked={selected.includes(name)}
        onChange={(e) => onToggle(name, e.target.checked)}
      >
        {name}
      </Checkbox>
    ))}
  </Space>
);

export default ThemesListTab;
