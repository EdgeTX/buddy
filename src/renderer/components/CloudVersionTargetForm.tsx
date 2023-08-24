import { DownOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { Checkbox, Dropdown, Form, Menu, Select } from "antd";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

type VersionFilters = {
  includePrereleases: boolean;
};

type FormItem = {
  selectedId?: string;
  available?: { id: string; name: string }[];
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
  filters: VersionFilters;
  versions: FormItem;
  disabled?: boolean;
};

const CloudVersionTargetForm: React.FC<Props> = ({
  onChanged,
  filters,
  versions,
  disabled,
}) => {
  const { t } = useTranslation("flashing");
  return (
    <Form
      layout="vertical"
      onValuesChange={(_, values) => {
        onChanged?.({ ...values, filters } as Parameters<typeof onChanged>[0]);
      }}
      fields={Object.entries({
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
                    target: versions.selectedId,
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

export default CloudVersionTargetForm;
