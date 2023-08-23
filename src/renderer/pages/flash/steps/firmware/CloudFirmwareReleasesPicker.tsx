import { gql, useQuery } from "@apollo/client";
import React from "react";
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

  console.log("FIRMWARE RELEASES SIMPLE", targetsQuery.data?.cloudFirmwares);
  console.log("FIRMWARE RELEASES PICKER", version, filters);

  const releases = targetsQuery.data?.cloudFirmwares.releases.map(
    (release) => ({
      id: release.id,
      name: release.name,
    })
  );

  console.log(releases);

  return (
    <CloudVersionTargetForm
      releases={{
        available: releases,
        error: !!targetsQuery.error,
        loading: targetsQuery.loading,
        tooltip: t(`The version of EdgeTX to flash`),
      }}
    />
  );
};

export default CloudFirmwareReleasesPicker;
