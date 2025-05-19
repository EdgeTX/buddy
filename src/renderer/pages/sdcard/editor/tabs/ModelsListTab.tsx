import React from "react";
import { Space, Checkbox, Collapse, Card, Typography } from "antd";

export type ModelEntry = {
  name: string;
  yaml: string;
  parsed?: unknown;
  bitmapName?: string | null;
  bitmapDataUrl?: string | null;
};

export type ModelsListTabProps = {
  models: ModelEntry[];
  selected: string[];
  onToggle: (name: string, checked: boolean) => void;
};

const { Panel } = Collapse;
const { Text, Title } = Typography;

type ModelDoc = {
  header?: {
    name?: string;
    labels?: string;
    bitmap?: string;
  };
};
function getHeader(parsed: unknown): ModelDoc["header"] | undefined {
  if (typeof parsed === "object" && parsed !== null) {
    const candidate = parsed as ModelDoc;
    if (
      candidate.header !== undefined &&
      typeof candidate.header === "object"
    ) {
      return candidate.header;
    }
  }
  return undefined;
}

const ModelsListTab: React.FC<ModelsListTabProps> = ({
  models,
  selected,
  onToggle,
}) => {
  const isLabelsFile = (m: ModelEntry): boolean =>
    m.name.toLowerCase() === "labels.yml";

  const sorted = [
    ...models.filter((m) => !isLabelsFile(m)),
    ...models.filter((m) => isLabelsFile(m)),
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      {sorted.map((m): React.ReactNode => {
        const header = getHeader(m.parsed);
        const displayName = header?.name ?? "Unknown Model";
        const labels = header?.labels;
        const isConfig = isLabelsFile(m);

        return (
          <Card
            key={m.name}
            size="small"
            style={isConfig ? { background: "#fafafa" } : undefined}
            title={isConfig ? "Config: labels.yml" : undefined}
          >
            <Space direction="vertical" style={{ width: "100%" }}>
              {!isConfig && (
                <Text strong style={{ fontSize: 14 }}>
                  File: {m.name}
                </Text>
              )}

              {!isConfig && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 8,
                  }}
                >
                  {m.bitmapDataUrl && (
                    <img
                      src={m.bitmapDataUrl}
                      alt={m.bitmapName ?? displayName}
                      style={{
                        height: 80,
                        width: "auto",
                        objectFit: "contain",
                        border: "1px solid #f0f0f0",
                        borderRadius: 4,
                      }}
                    />
                  )}
                  <div>
                    <Title level={5} style={{ margin: 0 }}>
                      {displayName}
                    </Title>
                    {labels && <Text type="secondary">{labels}</Text>}
                  </div>
                </div>
              )}

              {!isConfig && (
                <Checkbox
                  value={m.name}
                  checked={selected.includes(m.name)}
                  onChange={(e) => onToggle(m.name, e.target.checked)}
                  style={{ marginBottom: 8 }}
                >
                  Select "{m.name}"
                </Checkbox>
              )}

              <Collapse>
                <Panel header="View YML" key="yaml">
                  <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                    {m.yaml}
                  </pre>
                </Panel>
              </Collapse>
            </Space>
          </Card>
        );
      })}
    </Space>
  );
};

export default ModelsListTab;
