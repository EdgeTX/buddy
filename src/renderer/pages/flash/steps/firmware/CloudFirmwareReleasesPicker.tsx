import { gql, useQuery } from "@apollo/client";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import CloudVersionTargetForm from "renderer/components/CloudVersionTargetForm";
import { VersionFilters } from "renderer/components/VersionTargetForm";

type Props = {
  onChanged: (values: {
    version?: string;
    target?: string;
    filters: VersionFilters;
  }) => void;
  filters: VersionFilters;
  version?: string;
  target?: string;
};

const GET_FIRMWARES = gql(/* GraphQL */ `
  query Firmwares {
    cloudFirmwares {
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
    }
  }
`);

const CloudFirmwareReleasesPicker: React.FC<Props> = ({
  onChanged,
  filters,
  version,
  target,
}: Props) => {
  const { t } = useTranslation("flashing");
  const targetsQuery = useQuery(GET_FIRMWARES);

  // releases

  const releases = targetsQuery.data?.cloudFirmwares.releases
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
  const targets = targetsQuery.data?.cloudFirmwares.targets
    .filter(({ id }) => !excludedTargets.has(id))
    .sort((a, b) => a.name.localeCompare(b.name));
  const selectedTarget = targets?.find(({ id }) => id === target);

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

  console.log("EXCLUDED", excludedTargets);
  console.log("VERSION", version, releases, selectedRelease);
  console.log("TARGET", target, targets, selectedTarget);

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
    />
  );
};

export default CloudFirmwareReleasesPicker;
