import { gql, useQuery } from "@apollo/client";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import CloudVersionTargetForm from "renderer/components/CloudVersionTargetForm";
import { VersionFilters } from "renderer/components/VersionTargetForm";

type Props = {
  onChanged: (values: { version?: string; filters: VersionFilters }) => void;
  filters: VersionFilters;
  version?: string;
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
    }
  }
`);

const CloudFirmwareReleasesPicker: React.FC<Props> = ({
  onChanged,
  filters,
  version,
}: Props) => {
  const { t } = useTranslation("flashing");
  const targetsQuery = useQuery(GET_FIRMWARES);

  const releases = targetsQuery.data?.cloudFirmwares.releases
    .filter((release) => !release.isPrerelease || filters.includePrereleases)
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  const selectedRelease = releases?.find((release) => release.id === version);

  // Select first release if none is selected.
  useEffect(() => {
    if (!releases || releases.length === 0 || selectedRelease) return undefined;
    const timeout = setTimeout(() =>
      onChanged({
        version: releases[0]?.id,
        filters,
      })
    );
    return () => clearTimeout(timeout);
  }, [targetsQuery, onChanged, filters, releases, selectedRelease]);

  console.log("VERSION", version, releases);

  return (
    <CloudVersionTargetForm
      onChanged={onChanged}
      filters={filters}
      versions={{
        available: releases?.map((release) => ({
          id: release.id,
          name: release.name,
        })),
        selectedId: selectedRelease?.id,
        error: !!targetsQuery.error,
        loading: targetsQuery.loading,
        tooltip: t(`The version of EdgeTX to flash`),
      }}
    />
  );
};

export default CloudFirmwareReleasesPicker;
