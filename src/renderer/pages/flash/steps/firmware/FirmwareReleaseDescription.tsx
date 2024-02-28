import { useQuery } from "@apollo/client";
import gql from "gql";
import { Skeleton } from "antd";
import React from "react";
import Markdown from "renderer/components/Markdown";

type Props = {
  releaseId?: string;
};

const FirmwareReleaseDescription: React.FC<Props> = ({ releaseId }) => {
  const { data, loading } = useQuery(
    gql(`
      query FirmwareReleaseDescription($releaseId: ID!) {
        edgeTxRelease(id: $releaseId) {
          id
          description
        }
      }
    `),
    {
      variables: {
        releaseId: releaseId ?? "",
      },
      skip: !releaseId,
    }
  );

  if (loading) {
    return <Skeleton />;
  }

  const description = data?.edgeTxRelease?.description;

  if (!description) {
    return null;
  }

  return <Markdown>{description}</Markdown>;
};

export default FirmwareReleaseDescription;
