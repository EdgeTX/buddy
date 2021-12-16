import { Select, Form, Menu, Dropdown, Checkbox } from "antd";
import React, { useEffect, useState } from "react";
import { gql, useQuery } from "@apollo/client";
import { InfoCircleOutlined, DownOutlined } from "@ant-design/icons";
import useSorted from "renderer/hooks/useSorted";

export type VersionFilters = {
  includePrereleases: boolean;
};

type Props = {
  onChanged: (values: {
    target?: string;
    version?: string;
    filters: VersionFilters;
  }) => void;
  filters: VersionFilters;
  target?: string;
  version?: string;
};

const FirmwareReleasesPicker: React.FC<Props> = ({
  onChanged,
  target,
  version,
  filters,
}) => {
  const releasesQuery = useQuery(
    gql(/* GraphQL */ `
      query Releases {
        edgeTxReleases {
          id
          name
          isPrerelease
        }
      }
    `)
  );

  const releaseTargetsQuery = useQuery(
    gql(/* GraphQL */ `
      query ReleaseTargets($releaseId: ID!) {
        edgeTxRelease(id: $releaseId) {
          id
          firmwareBundle {
            id
            targets {
              id
              name
            }
          }
        }
      }
    `),
    {
      skip: !version,
      variables: {
        releaseId: version ?? "",
      },
    }
  );

  const releases = releasesQuery.data?.edgeTxReleases.filter(
    (release) => !release.isPrerelease || filters.includePrereleases
  );

  // TODO: sort releases by date, need to add date to schema
  const sortedReleases = useSorted(releases, () => 0);
  const selectedFirmware = releases?.find((release) => release.id === version);
  const targets =
    releaseTargetsQuery.data?.edgeTxRelease?.firmwareBundle.targets;

  const sortedTargets = useSorted(targets, (r1, r2) =>
    r1.name.localeCompare(r2.name)
  );

  // If a target is selected which is not in the new list,
  // deselect
  useEffect(() => {
    if (targets && target && !targets.find((t) => t.id === target)) {
      onChanged({ version, target: undefined, filters });
    }
  }, [targets, target, version, onChanged, filters]);

  // If a version is selected which is not in the list
  // deselect
  useEffect(() => {
    if (releases && version && !selectedFirmware) {
      onChanged({ version: undefined, target: undefined, filters });
    }
  }, [releases, version, onChanged, selectedFirmware, filters]);

  useEffect(() => {
    if (sortedReleases.length > 0 && !version && !releasesQuery.loading) {
      // Set the first selected version to the latest version
      onChanged({ version: sortedReleases[0]?.id, target: undefined, filters });
    }
  }, [sortedReleases, version, releasesQuery, onChanged, filters]);

  return (
    <Form
      layout="vertical"
      onValuesChange={(_, values) =>
        onChanged({ ...values, filters } as Parameters<typeof onChanged>[0])
      }
      fields={Object.entries({
        target,
        version,
      }).map(([key, value]) => ({ name: [key], value }))}
      size="large"
    >
      <Form.Item
        label="Version"
        name="version"
        tooltip={{
          title: "The version of EdgeTX to flash",
          icon: <InfoCircleOutlined />,
        }}
        help={
          releasesQuery.error ? (
            "Could not load releases"
          ) : (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <VersionFiltersDropdown
                filters={filters}
                onChange={(newFilters) => {
                  onChanged({ version, target, filters: newFilters });
                }}
              />
            </div>
          )
        }
        validateStatus={releasesQuery.error ? "error" : undefined}
        required
      >
        <Select
          value={version}
          allowClear={false}
          placeholder={
            releasesQuery.loading ? "Loading releases..." : "Select a version"
          }
          loading={releasesQuery.loading}
          disabled={!!releasesQuery.error}
        >
          {sortedReleases.map((r) => (
            <Select.Option key={r.id} value={r.id}>
              {r.name}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item
        label="Radio"
        name="target"
        tooltip={{
          title: "The type of radio you want to flash",
          icon: <InfoCircleOutlined />,
        }}
        help={releaseTargetsQuery.error ? "Could not load targets" : undefined}
        required
        validateStatus={releaseTargetsQuery.error ? "error" : undefined}
      >
        <Select
          value={target}
          allowClear={false}
          loading={releaseTargetsQuery.loading}
          disabled={
            !selectedFirmware ||
            !!releaseTargetsQuery.error ||
            releaseTargetsQuery.loading
          }
          placeholder={
            !selectedFirmware
              ? "Select a firmware to see available targets"
              : "Select a radio"
          }
        >
          {sortedTargets.map((t) => (
            <Select.Option key={t.id} value={t.id}>
              {t.name}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
    </Form>
  );
};

const filterNames: Record<keyof VersionFilters, string> = {
  includePrereleases: "Include pre-releases",
};

const VersionFiltersDropdown: React.FC<{
  filters: VersionFilters;
  onChange: (filters: VersionFilters) => void;
}> = ({ filters, onChange }) => {
  const [visible, setVisible] = useState(false);

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
        Filters <DownOutlined />
      </a>
    </Dropdown>
  );
};

export default FirmwareReleasesPicker;
