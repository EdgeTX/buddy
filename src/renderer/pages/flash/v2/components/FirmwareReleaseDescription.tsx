import { useQuery } from "@apollo/client";
import { Skeleton } from "antd";
import gql from "graphql-tag";
import React from "react";
import Markdown from "renderer/components/AntMarkdown";

type Props = {
  releaseId: string;
};

const FirmwareReleaseDescription: React.FC<Props> = ({ releaseId }) => {
  const { data, loading } = useQuery(
    gql(/* GraphQL */ `
      query FirmwareReleaseDescription($releaseId: ID!) {
        edgeTxRelease(id: $releaseId) {
          id
          description
        }
      }
    `),
    {
      variables: {
        releaseId,
      },
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
