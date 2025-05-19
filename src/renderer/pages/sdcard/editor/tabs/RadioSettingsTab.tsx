// src/renderer/pages/modelsSettings/tabs/RadioListTab.tsx
import React from "react";
import { Space, Card, Checkbox } from "antd";

export type RadioEntry = {
  name: string;
  yaml: string;
  parsed?: unknown;
};

export type RadioListTabProps = {
  radio: RadioEntry[];
  selected: string[];
  onToggle: (name: string, checked: boolean) => void;
};

const RadioListTab: React.FC<RadioListTabProps> = ({
  radio,
  selected,
  onToggle,
}) => (
  <Space direction="vertical" size="middle" style={{ width: "100%" }}>
    {radio.map(({ name, parsed }) => (
      <Card key={name} size="small" title={name}>
        <Checkbox
          value={name}
          checked={selected.includes(name)}
          onChange={(e) => onToggle(name, e.target.checked)}
          style={{ marginBottom: 8 }}
        >
          Select "{name}"
        </Checkbox>
        <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
          {JSON.stringify(parsed, null, 2)}
        </pre>
      </Card>
    ))}
  </Space>
);

export default RadioListTab;
