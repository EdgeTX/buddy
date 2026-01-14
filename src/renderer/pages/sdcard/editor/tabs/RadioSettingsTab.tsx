// src/renderer/pages/sdcard/editor/tabs/RadioListTab.tsx

import React, { useMemo } from "react";
import {
  Space,
  Card,
  Tabs,
  Descriptions,
  Table,
  Typography,
  Empty,
  Checkbox,
} from "antd";
import yaml from "js-yaml";

const { TabPane } = Tabs;
const { Title } = Typography;

export type RadioEntry = {
  name: string;
  yaml: string;
};

export type RadioListTabProps = {
  radio: RadioEntry[];
  selectedRadio: string[];
  onToggleRadio: (name: string, checked: boolean) => void;
  allModels: string[];
  selectedModels: string[];
  onToggleModel: (name: string, checked: boolean) => void;
  allThemes: string[];
  selectedThemes: string[];
  onToggleTheme: (name: string, checked: boolean) => void;
};

type CalibrationData = {
  mid: number;
  spanNeg: number;
  spanPos: number;
};

type ParsedRadio = {
  semver: string;
  board: string;
  currModelFilename: string;
  selectedTheme: string;
  calib?: Record<string, CalibrationData>;
};

function parseRadio(text: string): ParsedRadio | null {
  try {
    const doc = yaml.load(text);
    if (doc && typeof doc === "object") {
      return doc as ParsedRadio;
    }
  } catch {
    // parse error
  }
  return null;
}

const RadioListTab: React.FC<RadioListTabProps> = ({
  radio,
  selectedRadio,
  onToggleRadio,
  allModels,
  selectedModels,
  onToggleModel,
  allThemes,
  selectedThemes,
  onToggleTheme,
}): JSX.Element => {
  const parsedEntries = useMemo(
    () =>
      radio.map(({ name, yaml: yamlText }) => ({
        name,
        yamlText,
        parsed: parseRadio(yamlText),
      })),
    [radio]
  );

  // bulk selection states
  const allRadioSelected =
    radio.length > 0 && radio.every((r) => selectedRadio.includes(r.name));
  const allModelsSelected =
    allModels.length > 0 && selectedModels.length === allModels.length;
  const allThemesSelected =
    allThemes.length > 0 && selectedThemes.length === allThemes.length;

  if (parsedEntries.length === 0) {
    return <Empty description="No radio configuration found" />;
  }

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      {/* Individual Radio Entries */}
      {parsedEntries.map(({ name, yamlText, parsed }) => {
        if (!parsed) {
          return (
            <Card key={name} size="small" title={name}>
              <p>Failed to parse YAML</p>
            </Card>
          );
        }

        const calibData = parsed.calib
          ? Object.entries(parsed.calib).map(([channel, data]) => ({
              channel,
              ...data,
            }))
          : [];

        return (
          <Card
            key={name}
            size="small"
            title={
              <div style={{ display: "flex", alignItems: "center" }}>
                <Checkbox
                  checked={selectedRadio.includes(name)}
                  onChange={(e) => onToggleRadio(name, e.target.checked)}
                  style={{ marginRight: 8 }}
                />
                <Title level={5} style={{ margin: 0 }}>
                  {name}
                </Title>
              </div>
            }
          >
            <Tabs defaultActiveKey="summary">
              <TabPane tab="Summary" key="summary">
                <Descriptions column={1} bordered size="small">
                  <Descriptions.Item label="Firmware">
                    {parsed.semver} ({parsed.board})
                  </Descriptions.Item>
                  <Descriptions.Item label="Model File">
                    {parsed.currModelFilename}
                  </Descriptions.Item>
                  <Descriptions.Item label="Selected Theme">
                    {parsed.selectedTheme}
                  </Descriptions.Item>
                </Descriptions>
              </TabPane>

              {calibData.length > 0 && (
                <TabPane tab="Calibration" key="calibration">
                  <Table
                    dataSource={calibData}
                    rowKey="channel"
                    pagination={false}
                    size="small"
                    columns={[
                      {
                        title: "Channel",
                        dataIndex: "channel",
                        key: "channel",
                      },
                      { title: "Mid", dataIndex: "mid", key: "mid" },
                      { title: "Span -", dataIndex: "spanNeg", key: "spanNeg" },
                      { title: "Span +", dataIndex: "spanPos", key: "spanPos" },
                    ]}
                  />
                </TabPane>
              )}

              <TabPane tab="YAML" key="yaml">
                <pre
                  style={{
                    backgroundColor: "#f6f8fa",
                    fontFamily:
                      "SFMono-Regular, Menlo, Consolas, Monaco, Courier New, monospace",
                    fontSize: 12,
                    lineHeight: "1.5",
                    padding: 12,
                    borderRadius: 4,
                    overflowX: "auto",
                    margin: 0,
                  }}
                >
                  {yamlText.trim()}
                </pre>
              </TabPane>
            </Tabs>
          </Card>
        );
      })}

      {/* Backup Scope Section */}
      <Card size="small" title="Backup Scope">
        <Space direction="vertical">
          <Checkbox
            checked={allModelsSelected}
            onChange={(e) =>
              allModels.forEach((m) => onToggleModel(m, e.target.checked))
            }
          >
            Models (Assets {selectedModels.length}/{allModels.length})
          </Checkbox>
          <Checkbox
            checked={allThemesSelected}
            onChange={(e) =>
              allThemes.forEach((t) => onToggleTheme(t, e.target.checked))
            }
          >
            Themes (Assets {selectedThemes.length}/{allThemes.length})
          </Checkbox>
          <Checkbox
            checked={allRadioSelected}
            onChange={(e) =>
              parsedEntries.forEach(({ name }) =>
                onToggleRadio(name, e.target.checked)
              )
            }
          >
            Radio Settings (Assets {selectedRadio.length}/{radio.length})
          </Checkbox>
        </Space>
      </Card>
    </Space>
  );
};

export default RadioListTab;
