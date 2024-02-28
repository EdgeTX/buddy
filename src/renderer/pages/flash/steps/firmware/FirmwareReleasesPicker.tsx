import React, { useEffect } from "react";
import { useQuery } from "@apollo/client";
import gql from "gql";
import useSorted from "renderer/hooks/useSorted";
import VersionTargetForm, {
  VersionFilters,
} from "renderer/components/VersionTargetForm";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("flashing");
  const releasesQuery = useQuery(
    gql(`
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
    gql(`
      query ReleaseTargets($releaseId: ID!) {
        edgeTxRelease(id: $releaseId) {
          id
          firmwareBundle {
            id
            targets {
              id
              code
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

  const isPreviewRelease = !!releasesQuery.data?.edgeTxReleases.find(
    (release) => release.id === version
  )?.isPrerelease;

  // TODO: sort releases by date, need to add date to schema
  const sortedReleases = useSorted(releases, () => 0);
  const selectedFirmware = releases?.find((release) => release.id === version);
  const targets =
    releaseTargetsQuery.data?.edgeTxRelease?.firmwareBundle.targets.map(
      ({ code, name }) => ({ id: code, name })
    );

  const sortedTargets = useSorted(targets, (r1, r2) =>
    r1.name.localeCompare(r2.name)
  );
  const selectedTarget = sortedTargets.find(({ id }) => id === target);

  // If a target is selected which is not in the new list,
  // deselect
  useEffect(() => {
    if (
      sortedTargets.length > 0 &&
      target &&
      !selectedTarget &&
      releaseTargetsQuery.loading
    ) {
      onChanged({ version, target: undefined, filters });
    }
  }, [
    sortedTargets.length,
    selectedTarget,
    target,
    version,
    onChanged,
    filters,
    releaseTargetsQuery,
  ]);

  // If a version is selected which is not in the list
  // deselect
  useEffect(() => {
    if (releases && version && !selectedFirmware) {
      if (isPreviewRelease && !filters.includePrereleases) {
        onChanged({
          version,
          target,
          filters: { ...filters, includePrereleases: true },
        });
      } else {
        onChanged({ version: undefined, target: undefined, filters });
      }
    }
  }, [
    releases,
    version,
    onChanged,
    selectedFirmware,
    filters,
    isPreviewRelease,
    target,
  ]);

  useEffect(() => {
    if (sortedReleases.length > 0 && !version && !releasesQuery.loading) {
      // Set the first selected version to the latest version
      const timeout = setTimeout(() =>
        onChanged({
          version: sortedReleases[0]?.id,
          target: undefined,
          filters,
        })
      );

      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [sortedReleases, version, releasesQuery, onChanged, filters]);

  return (
    <VersionTargetForm
      onChanged={onChanged}
      filters={filters}
      versions={{
        available: sortedReleases,
        selectedId: selectedFirmware?.id,
        error: !!releasesQuery.error,
        loading: releasesQuery.loading,
        tooltip: t(`The version of EdgeTX to flash`),
      }}
      targets={{
        available: sortedTargets,
        selectedId: selectedTarget?.id,
        error: !!releaseTargetsQuery.error,
        loading: releaseTargetsQuery.loading,
        tooltip: t(`The type of radio you want to flash`),
      }}
    />
  );
};

export default FirmwareReleasesPicker;
