import { DownOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { Checkbox, Dropdown, Form, Menu, Select } from "antd";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

export type VersionFilters = {
  includePrereleases: boolean;
};

type FormItem = {
  selectedId?: string;
  available: { id: string; name: string }[] | null;
  loading?: boolean;
  error?: boolean;
  tooltip?: string;
  placeholder?: string;
};

type Props = {
  onChanged?: (values: {
    target?: string;
    version?: string;
    filters: VersionFilters;
  }) => void;
  disabled?: boolean;
  filters: VersionFilters;
  targets: FormItem;
  versions: FormItem;
};

const VersionTargetForm: React.FC<Props> = ({
  onChanged,
  filters,
  versions,
  targets,
  disabled,
}) => {
  const { t } = useTranslation("flashing");
  return (
    <Form
      layout="vertical"
      onValuesChange={(_, values) =>
        onChanged?.({ ...values, filters } as Parameters<typeof onChanged>[0])
      }
      fields={Object.entries({
        target: targets.selectedId,
        version: versions.selectedId,
      }).map(([key, value]) => ({ name: [key], value }))}
      size="large"
    >
      <Form.Item
        label={t(`Firmware version`)}
        name="version"
        tooltip={
          versions.tooltip
            ? {
                title: versions.tooltip,
                icon: <InfoCircleOutlined />,
              }
            : versions.tooltip
        }
        help={
          versions.error ? (
            t(`Could not load releases`)
          ) : (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <VersionFiltersDropdown
                filters={filters}
                onChange={(newFilters) => {
                  onChanged?.({
                    version: versions.selectedId,
                    target: targets.selectedId,
                    filters: newFilters,
                  });
                }}
              />
            </div>
          )
        }
        validateStatus={versions.error ? "error" : undefined}
        required
      >
        <Select
          value={versions.selectedId}
          allowClear={false}
          placeholder={
            versions.loading
              ? t(`Loading releases...`)
              : versions.placeholder ?? t(`Select firmware version`)
          }
          loading={versions.loading}
          virtual={process.env.NODE_ENV !== "test"}
          disabled={!!versions.error || disabled}
        >
          {versions.available?.map((r) => (
            <Select.Option key={r.id} value={r.id}>
              {r.name}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item
        label={t(`Radio model`)}
        name="target"
        tooltip={
          targets.tooltip
            ? {
                title: t(`The type of radio you want to flash`),
                icon: <InfoCircleOutlined />,
              }
            : undefined
        }
        help={targets.error ? t(`Could not load targets`) : undefined}
        required
        validateStatus={targets.error ? "error" : undefined}
      >
        <Select
          value={targets.selectedId}
          showSearch
          optionFilterProp="children"
          allowClear={false}
          loading={targets.loading}
          virtual={process.env.NODE_ENV !== "test"}
          disabled={
            !versions.selectedId ||
            !!targets.error ||
            !!targets.loading ||
            disabled
          }
          placeholder={
            !versions.selectedId
              ? t(`Select firmware to see available models`)
              : versions.placeholder ?? t(`Select radio model`)
          }
          notFoundContent={null}
        >
          {targets.available?.map((tar) => (
            <Select.Option key={tar.id} value={tar.id}>
              {tar.name}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
    </Form>
  );
};

const VersionFiltersDropdown: React.FC<{
  filters: VersionFilters;
  onChange: (filters: VersionFilters) => void;
}> = ({ filters, onChange }) => {
  const [visible, setVisible] = useState(false);
  const { t } = useTranslation("flashing");

  const filterNames: Record<keyof VersionFilters, string> = {
    includePrereleases: t(`Include pre-releases`),
  };

  return (
    <Dropdown
      visible={visible}
      trigger={["click"]}
      onVisibleChange={(flag) => setVisible(flag)}
      overlay={
        <Menu>
          {(Object.entries(filters) as [keyof VersionFilters, boolean][]).map(
            ([key, value]) => (
              <Menu.Item key={key}>
                <Checkbox
                  checked={value}
                  onChange={(e) =>
                    onChange({ ...filters, [key]: e.target.checked })
                  }
                >
                  {filterNames[key]}
                </Checkbox>
              </Menu.Item>
            )
          )}
        </Menu>
      }
    >
      {/* eslint-disable-next-line jsx-a11y/anchor-is-valid, jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <a className="ant-dropdown-link" onClick={(e) => e.preventDefault()}>
        {t(`Filters`)} <DownOutlined />
      </a>
    </Dropdown>
  );
};

export default VersionTargetForm;
