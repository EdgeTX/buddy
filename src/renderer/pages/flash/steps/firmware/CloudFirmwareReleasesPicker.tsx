import { gql, useQuery } from "@apollo/client";
import React from "react";
import CloudVersionTargetForm from "renderer/components/CloudVersionTargetForm";
import { VersionFilters } from "renderer/components/VersionTargetForm";

type Props = {
  onChanged: (values: { version?: string; filters: VersionFilters }) => void;
  filters: VersionFilters;
  version?: string;
};

const GET_SIMPLE = gql(/* GraphQL */ `
  query Simple($name: String) {
    simple(name: $name) {
      bloup
    }
  }
`);

const CloudFirmwareReleasesPicker: React.FC<Props> = ({
  filters,
  version,
}: Props) => {
  const simple = useQuery(GET_SIMPLE, {
    variables: { name: "riri" },
  });

  console.log("FIRMWARE RELEASES SIMPLE", simple.data?.simple.bloup);
  console.log("FIRMWARE RELEASES PICKER", version, filters);

  return <CloudVersionTargetForm />;
};

export default CloudFirmwareReleasesPicker;
