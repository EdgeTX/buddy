import { Select, Form } from "antd";
import React, { useEffect } from "react";
import { gql, useQuery } from "@apollo/client";
import { InfoCircleOutlined } from "@ant-design/icons";
import useSorted from "renderer/hooks/useSorted";

type Props = {
  onChanged: (values: { target?: string; version?: string }) => void;
  prereleases?: boolean;
  target?: string;
  version?: string;
};

const FirmwareReleasesPicker: React.FC<Props> = ({
  onChanged,
  target,
  version,
  prereleases = false,
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
    (release) => release.isPrerelease === prereleases
  );

  const sortedReleases = useSorted(releases, (r1, r2) =>
    r2.id.localeCompare(r1.id)
  );
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
      onChanged({ version, target: undefined });
    }
  }, [targets, target, version, onChanged]);

  // If a version is selected which is not in the list
  // deselect
  useEffect(() => {
    if (releases && version && !selectedFirmware) {
      onChanged({ version: undefined, target: undefined });
    }
  }, [releases, version, onChanged, selectedFirmware]);

  useEffect(() => {
    if (sortedReleases.length > 0 && !version && !releasesQuery.loading) {
      // Set the first selected version to the latest version
      onChanged({ version: sortedReleases[0]?.id, target: undefined });
    }
  }, [sortedReleases, version, releasesQuery, onChanged]);

  return (
    <Form
      layout="vertical"
      onValuesChange={(_, values) =>
        onChanged(values as Parameters<typeof onChanged>[0])
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
        help={releasesQuery.error ? "Could not load releases" : undefined}
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

export default FirmwareReleasesPicker;
