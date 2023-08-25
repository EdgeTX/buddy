import { gql, useQuery } from "@apollo/client";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import CloudVersionTargetForm from "renderer/components/CloudVersionTargetForm";
import { VersionFilters } from "renderer/components/VersionTargetForm";
import { SelectedFlags } from "renderer/hooks/useFlags";

type Props = {
  onChanged: (values: {
    filters: VersionFilters;
    version?: string;
    target?: string;
    selectedFlags?: SelectedFlags;
  }) => void;
  filters: VersionFilters;
  version?: string;
  target?: string;
  selectedFlags?: SelectedFlags;
};

const GET_FIRMWARES = gql(/* GraphQL */ `
  query CloudTargets {
    cloudTargets {
      releases {
        id
        name
        isPrerelease
        timestamp
        excludeTargets
      }
      targets {
        id
        name
        tags
      }
      flags {
        id
        values
      }
      tags {
        id
        tagFlags {
          id
          values
        }
      }
    }
  }
`);

const CloudFirmwareReleasesPicker: React.FC<Props> = ({
  onChanged,
  filters,
  version,
  target,
  selectedFlags,
}: Props) => {
  const { t } = useTranslation("flashing");
  const targetsQuery = useQuery(GET_FIRMWARES);

  // releases

  const releases = targetsQuery.data?.cloudTargets.releases
    .filter(({ isPrerelease }) => !isPrerelease || filters.includePrereleases)
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  const selectedRelease = releases?.find(({ id }) => id === version);

  // Select first release if none is selected or current version not in releases.
  useEffect(() => {
    if (!releases || releases.length === 0 || selectedRelease) return undefined;
    const timeout = setTimeout(() =>
      onChanged({
        version: releases[0]?.id,
        target,
        filters,
      })
    );
    return () => clearTimeout(timeout);
  }, [targetsQuery, onChanged, filters, releases, selectedRelease, target]);

  // targets

  const excludedTargets = new Set(selectedRelease?.excludeTargets);
  const targets = targetsQuery.data?.cloudTargets.targets
    .filter(({ id }) => !excludedTargets.has(id))
    .sort((a, b) => a.name.localeCompare(b.name));
  const selectedTarget = targets?.find(({ id }) => id === target);

  // flags

  const tags = targetsQuery.data?.cloudTargets.tags;
  const targetTags = new Set(selectedTarget?.tags);
  const targetFlags = tags
    ?.filter((tag) => targetTags.has(tag.id))
    .reduce((map, { tagFlags }) => {
      for (const flag of tagFlags) {
        map.set(flag.id, flag.values);
      }
      return map;
    }, new Map<string, string[]>());

  // add the additional flags values from the target in the flags
  const flags = targetsQuery.data?.cloudTargets.flags.map((flag) => ({
    id: flag.id,
    values: [...flag.values, ...(targetFlags?.get(flag.id) ?? [])],
  }));

  flags?.push({ id: "bloup", values: ["blap", "blip", "blup"] });

  // Unselect target if selected target does not exist.
  useEffect(() => {
    if (!target || selectedTarget) return undefined;
    const timeout = setTimeout(() =>
      onChanged({
        version,
        target: undefined,
        filters,
      })
    );
    return () => clearTimeout(timeout);
  }, [filters, onChanged, version, target, selectedTarget]);

  // console.log("EXCLUDED", excludedTargets);
  // console.log("VERSION", version, releases, selectedRelease);
  console.log("TARGET", target, targets, selectedTarget);
  console.log("FLAGS", selectedFlags);

  return (
    <CloudVersionTargetForm
      onChanged={onChanged}
      filters={filters}
      versions={{
        available: releases?.map(({ id, name }) => ({ id, name })),
        selectedId: selectedRelease?.id,
        error: !!targetsQuery.error,
        loading: targetsQuery.loading,
        tooltip: t(`The version of EdgeTX to flash`),
      }}
      targets={{
        available: targets?.map(({ id, name }) => ({ id, name })),
        selectedId: selectedTarget?.id,
        error: !!targetsQuery.error,
        loading: targetsQuery.loading,
        tooltip: t(`The type of radio you want to flash`),
      }}
      flags={flags}
      selectedFlags={selectedFlags}
    />
  );
};

export default CloudFirmwareReleasesPicker;
