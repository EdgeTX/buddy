import { useQuery, gql } from "@apollo/client";
import { Skeleton } from "antd";
import React from "react";
import Markdown from "renderer/components/Markdown";

type Props = {
  prId?: string;
};

const FirmwarePrDescription: React.FC<Props> = ({ prId }) => {
  const { data, loading } = useQuery(
    gql(/* GraphQL */ `
      query PrDescription($prId: ID!) {
        edgeTxPr(id: $prId) {
          id
          description
        }
      }
    `),
    {
      variables: {
        prId: prId ?? "",
      },
      skip: !prId,
    }
  );

  if (loading) {
    return <Skeleton />;
  }

  const description = data?.edgeTxPr?.description;

  if (!description) {
    return null;
  }

  return <Markdown>{description}</Markdown>;
};

export default FirmwarePrDescription;
