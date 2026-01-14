// src/renderer/pages/sdcard/editor/tabs/ModelsListTab.tsx

import React, { useState, useMemo } from "react";
import { Input, Space, Checkbox, Card, Typography, Tabs, Popover } from "antd";

const { Search } = Input;
const { Text } = Typography;
const { TabPane } = Tabs;

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

// Parsed YAML shape
type ParsedModel = {
  semver?: string;
  header?: {
    lastopen?: number;
    hash?: string;
    bitmap?: string;
  };
};

// Labels file shape
type LabelDoc = {
  Labels?: Record<string, unknown>;
};

// Metadata extracted for display
type ExtractedMeta = {
  semver?: string;
  lastOpen?: Date;
  hash?: string;
  bitmap?: string;
};

function extractMeta(parsed: unknown): ExtractedMeta {
  if (typeof parsed === "object" && parsed !== null) {
    const doc = parsed as ParsedModel;
    const { semver } = doc;
    const lastOpen = doc.header?.lastopen
      ? new Date(doc.header.lastopen * 1000)
      : undefined;
    const hash = doc.header?.hash;
    const bitmap = doc.header?.bitmap;
    return { semver, lastOpen, hash, bitmap };
  }
  return {};
}

const ModelsListTab: React.FC<ModelsListTabProps> = ({
  models,
  selected,
  onToggle,
}): JSX.Element => {
  const [filterText, setFilterText] = useState<string>("");

  const { labelsMap, modelEntries } = useMemo(() => {
    const map: Record<string, string[]> = {};
    const labelsEntry = models.find(
      (m) => m.name.toLowerCase() === "labels.yml"
    );
    let entries = models;

    if (
      labelsEntry &&
      typeof labelsEntry.parsed === "object" &&
      labelsEntry.parsed !== null
    ) {
      const doc = labelsEntry.parsed as LabelDoc;
      if (doc.Labels && typeof doc.Labels === "object") {
        Object.entries(doc.Labels).forEach(([label, names]) => {
          if (Array.isArray(names)) {
            map[label] = names.filter(
              (n): n is string => typeof n === "string"
            );
          }
        });
      }
      entries = models.filter((m) => m !== labelsEntry);
    }

    return { labelsMap: map, modelEntries: entries };
  }, [models]);

  const sections = useMemo<Record<string, ModelEntry[]>>(() => {
    const result: Record<string, ModelEntry[]> = {};
    Object.keys(labelsMap).forEach((label) => {
      result[label] = [];
    });
    result.Other = [];

    modelEntries.forEach((m) => {
      const matchesFilter =
        m.name.toLowerCase().includes(filterText.toLowerCase()) ||
        Object.entries(labelsMap).some(
          ([lbl, names]) =>
            lbl.toLowerCase().includes(filterText.toLowerCase()) &&
            names.includes(m.name)
        );
      if (!matchesFilter) return;

      const found = Object.entries(labelsMap).find(([, names]) =>
        names.includes(m.name)
      );
      if (found) {
        result[found[0]]?.push(m);
      } else {
        result.Other?.push(m);
      }
    });

    return result;
  }, [modelEntries, labelsMap, filterText]);

  return (
    <>
      <Search
        placeholder="Search models or labels…"
        onChange={(e) => setFilterText(e.target.value)}
        style={{ marginBottom: 16 }}
        allowClear
      />

      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {Object.entries(sections).map(([section, entries]) =>
          entries.length ? (
            <div key={section}>
              <Typography.Title level={4}>{section}</Typography.Title>
              <Space wrap align="start">
                {entries.map((m) => {
                  const { semver, lastOpen, hash, bitmap } = extractMeta(
                    m.parsed
                  );
                  return (
                    <Card
                      key={m.name}
                      size="small"
                      hoverable
                      style={{ width: 240, position: "relative" }}
                      title={
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <Checkbox
                            checked={selected.includes(m.name)}
                            onChange={(e) => onToggle(m.name, e.target.checked)}
                            style={{ marginRight: 8 }}
                          />
                          <div>
                            <Text strong>{m.name}</Text>
                            {semver && (
                              <Text type="secondary" style={{ marginLeft: 8 }}>
                                v{semver}
                              </Text>
                            )}
                          </div>
                        </div>
                      }
                    >
                      <Tabs defaultActiveKey="info">
                        <TabPane tab="Info" key="info">
                          <Space direction="vertical">
                            {bitmap && m.bitmapDataUrl && (
                              <Popover
                                content={
                                  <img
                                    src={m.bitmapDataUrl}
                                    alt={bitmap}
                                    style={{ maxWidth: 300 }}
                                  />
                                }
                              >
                                <img
                                  src={m.bitmapDataUrl}
                                  alt={bitmap}
                                  style={{
                                    height: 60,
                                    cursor: "zoom-in",
                                    borderRadius: 4,
                                    border: "1px solid #f0f0f0",
                                  }}
                                />
                              </Popover>
                            )}
                            {lastOpen && (
                              <Text>
                                Last opened: {lastOpen.toLocaleString()}
                              </Text>
                            )}
                            {hash && <Text copyable>Hash: {hash}</Text>}
                          </Space>
                        </TabPane>
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
                            {m.yaml.trim()}
                          </pre>
                        </TabPane>
                      </Tabs>
                    </Card>
                  );
                })}
              </Space>
            </div>
          ) : null
        )}
      </Space>
    </>
  );
};

export default ModelsListTab;
