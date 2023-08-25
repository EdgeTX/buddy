import {
  DownOutlined,
  InfoCircleOutlined,
  MinusCircleOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Button, Checkbox, Divider, Dropdown, Form, Menu, Select } from "antd";
import { FormListFieldData } from "antd/lib/form/FormList";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Flags, SelectedFlags } from "renderer/hooks/useFlags";

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
    version?: string;
    target?: string;
    filters: VersionFilters;
    selectedFlags?: SelectedFlags;
  }) => void;
  disabled?: boolean;
  filters: VersionFilters;
  versions: FormItem;
  targets: FormItem;
  flags?: Flags;
  selectedFlags?: SelectedFlags;
};

const CloudVersionTargetForm: React.FC<Props> = ({
  onChanged,
  disabled,
  filters,
  versions,
  targets,
  flags,
  selectedFlags,
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
        target: targets.selectedId,
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

      <Divider />

      <Form.List name="selectedFlags" initialValue={selectedFlags}>
        {(fields, { add, remove }) => (
          <Form.Item label="Flags">
            {fields.map((value, index) => (
              <div key={value.key}>
                <FormTag
                  {...{
                    value,
                    index,
                    remove,
                    flags,
                    selectedFlags,
                  }}
                />
              </div>
            ))}

            <Form.Item>
              <Button
                type="dashed"
                onClick={() => add()}
                block
                icon={<PlusOutlined />}
              >
                Add Flag
              </Button>
            </Form.Item>
          </Form.Item>
        )}
      </Form.List>
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

interface FormTagProps {
  value: FormListFieldData;
  remove: (index: number | number[]) => void;
  flags?: Flags;
  selectedFlags?: SelectedFlags;
}

function FormTag({ value, remove, flags, selectedFlags }: FormTagProps) {
  const currentFlag = selectedFlags?.at(value.key)?.name;
  const currentValue = selectedFlags?.at(value.key)?.value;

  const selectedFlagsName = new Set(selectedFlags?.map((flag) => flag.name));

  const flagNames =
    flags
      ?.filter((flag) => !selectedFlagsName.has(flag.id))
      .map((flag) => ({ name: flag.id, value: flag.id })) ?? [];

  const unfilteredFlagValues =
    flags?.find((flag) => flag.id === currentFlag)?.values ?? [];

  // remove duplicates
  const flagValuesSet = new Set(unfilteredFlagValues);
  const flagValues = [...flagValuesSet].map((value) => ({
    name: value,
    value,
  }));

  // reset the flag value if the target or flag name doesn't support it
  useEffect(() => {
    if (!currentValue || !flagValuesSet || flagValuesSet.size === 0) return;
    if (!flagValuesSet.has(currentValue)) {
      // setCurrentValue(undefined);
    }
  }, [flagValuesSet, currentValue]);

  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
      <div style={{ display: "flex", gap: 8, width: "100%" }}>
        <Form.Item
          style={{ width: "50%" }}
          name={[value.name, "name"]}
          rules={[{ required: true, message: "Missing flag" }]}
        >
          <Select
            showSearch
            placeholder="Flag"
            options={flagNames}
          />
        </Form.Item>

        <Form.Item
          style={{ width: "50%" }}
          name={[value.name, "value"]}
          rules={[{ required: true, message: "Missing value" }]}
        >
          <Select
            showSearch
            placeholder="Value"
            options={flagValues}
          />
        </Form.Item>
      </div>
      <MinusCircleOutlined
        onClick={() => remove(value.name)}
        style={{ fontSize: "1.15rem", transform: "translate(0, 4px)" }}
      />
    </div>
  );
}

export default CloudVersionTargetForm;
