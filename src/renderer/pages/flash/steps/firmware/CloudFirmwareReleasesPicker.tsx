import { useQuery } from "@apollo/client";
import gql from "gql";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import CloudVersionTargetForm from "renderer/components/CloudVersionTargetForm";
import { VersionFilters } from "renderer/components/VersionTargetForm";
import { SelectedFlags } from "shared/backend/types";

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

const GET_FIRMWARES = gql(`
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
        selectedFlags,
      })
    );
    return () => clearTimeout(timeout);
  }, [
    targetsQuery,
    onChanged,
    filters,
    releases,
    selectedRelease,
    target,
    selectedFlags,
  ]);

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
      tagFlags.forEach((flag) => {
        map.set(flag.id, flag.values);
      });
      return map;
    }, new Map<string, string[]>());

  // add the additional flags values from the target in the flags
  const flags = targetsQuery.data?.cloudTargets.flags.map((flag) => {
    const targetValues = targetFlags?.get(flag.id);
    targetFlags?.delete(flag.id);
    return {
      id: flag.id,
      values: [...flag.values, ...(targetValues ?? [])],
    };
  });

  // add the additional flags from target tags
  targetFlags?.forEach((values, flagId) => {
    flags?.push({ id: flagId, values });
  });

  // only update flags
  const updateSelectedFlags = (newSelectedFlags: SelectedFlags): void => {
    onChanged({
      version,
      target,
      filters,
      selectedFlags: newSelectedFlags,
    });
  };

  // only update filters
  const updateFilters = (newFilters: VersionFilters): void => {
    onChanged({
      version,
      target,
      filters: newFilters,
      selectedFlags,
    });
  };

  // Unselect target if selected target does not exist.
  useEffect(() => {
    if (!target || !!selectedTarget || !targets) return undefined;
    const timeout = setTimeout(() =>
      onChanged({
        version,
        target: undefined,
        filters,
        selectedFlags,
      })
    );
    return () => clearTimeout(timeout);
  }, [
    filters,
    onChanged,
    version,
    target,
    selectedTarget,
    selectedFlags,
    targets,
  ]);

  return (
    <CloudVersionTargetForm
      onChanged={onChanged}
      updateSelectedFlags={updateSelectedFlags}
      updateFilters={updateFilters}
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
