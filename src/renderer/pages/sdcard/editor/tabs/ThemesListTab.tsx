// src/renderer/pages/modelsSettings/tabs/ThemesListTab.tsx

import React from "react";
import { Checkbox, Typography, Row, Col, Image, Collapse, Space } from "antd";
import yaml from "js-yaml";

const { Text, Paragraph, Title } = Typography;
const { Panel } = Collapse;

export type ThemeInfo = {
  /** folder name, e.g. "FM2M_HellYeah" */
  name: string;
  /** raw contents of theme.yml */
  yaml: string;
  /** data-URL for logo.png */
  logoUrl?: string | null;
  /** data-URL for background.png */
  backgroundUrl?: string | null;
};

export type ThemesListTabProps = {
  themes: ThemeInfo[];
  selected: string[];
  onToggle: (id: string, checked: boolean) => void;
};

/** Parse the YAML front-matter into display fields */
function parseTheme(
  yamlText: string,
  themeName: string
): {
  displayName: string;
  author?: string;
  description?: string;
  colors?: Record<string, string | number>;
} {
  // Default theme folder (EdgeTX) often has no YAML; show as "Default"
  if (!yamlText && themeName === "EdgeTX") {
    return {
      displayName: "Default",
      author: undefined,
      description: undefined,
      colors: undefined,
    };
  }

  const doc = yaml.load(yamlText) as {
    summary?: { name?: string; author?: string; info?: string };
    colors?: Record<string, string | number>;
  } | null;

  return {
    displayName: doc?.summary?.name ?? "Unknown Theme",
    author: doc?.summary?.author,
    description: doc?.summary?.info,
    colors: doc?.colors,
  };
}

/** Render little color swatches from a hex map */
const ColorSwatches: React.FC<{ colors: Record<string, string | number> }> = ({
  colors,
}) => (
  <Space wrap>
    {Object.entries(colors).map(([key, value]) => {
      let code: string;
      if (typeof value === "number") {
        code = value.toString(16).padStart(6, "0");
      } else {
        code = value.replace(/^0x/, "").padStart(6, "0");
      }
      const hex = `#${code}`;

      return (
        <div
          key={key}
          title={key}
          style={{
            width: 24,
            height: 24,
            backgroundColor: hex,
            border: "1px solid #ccc",
            borderRadius: 4,
          }}
        />
      );
    })}
  </Space>
);

const ThemesListTab: React.FC<ThemesListTabProps> = ({
  themes,
  selected,
  onToggle,
}) => {
  // sort so Default (EdgeTX) appears first
  const sortedThemes = [...themes].sort((a, b) => {
    if (a.name === "EdgeTX") return -1;
    if (b.name === "EdgeTX") return 1;
    return 0;
  });

  return (
    <Collapse accordion>
      {sortedThemes.map((theme) => {
        const { displayName, author, description, colors } = parseTheme(
          theme.yaml,
          theme.name
        );

        return (
          <Panel
            key={theme.name}
            header={
              <Row align="middle" gutter={8}>
                {/* Checkbox toggle */}
                <Col>
                  <Checkbox
                    checked={selected.includes(theme.name)}
                    onChange={(e) => onToggle(theme.name, e.target.checked)}
                  />
                </Col>

                {/* Title and author */}
                <Col flex="auto">
                  <Title level={5} style={{ margin: 0, display: "inline" }}>
                    {displayName}
                  </Title>
                  {author && (
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      by {author}
                    </Text>
                  )}
                </Col>

                {/* Logo image */}
                {theme.logoUrl && (
                  <Col>
                    <Image
                      width={32}
                      src={theme.logoUrl}
                      alt={`${displayName} logo`}
                    />
                  </Col>
                )}
              </Row>
            }
          >
            <Space direction="vertical" size="small" style={{ width: "100%" }}>
              {/* Background banner */}
              {theme.backgroundUrl && (
                <Image
                  src={theme.backgroundUrl}
                  alt={`${displayName} background`}
                  preview={false}
                  style={{ width: "100%", maxHeight: 120, objectFit: "cover" }}
                />
              )}

              {/* Description */}
              {description && <Paragraph>{description}</Paragraph>}

              {/* Color palette */}
              {colors && (
                <>
                  <Text strong>Color Palette:</Text>
                  <ColorSwatches colors={colors} />
                </>
              )}
            </Space>
          </Panel>
        );
      })}
    </Collapse>
  );
};

export default ThemesListTab;
