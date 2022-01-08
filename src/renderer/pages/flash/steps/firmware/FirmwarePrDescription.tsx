import { useQuery, gql } from "@apollo/client";
import { Divider, Skeleton, Typography } from "antd";
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
          title
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
    return <Skeleton title />;
  }

  const description = data?.edgeTxPr?.description;
  const title = data?.edgeTxPr?.title;

  if (!title) {
    return null;
  }

  return (
    <div>
      <Typography.Title level={3}>{title}</Typography.Title>
      <Divider />
      {description && <Markdown>{description}</Markdown>}
    </div>
  );
};

export default FirmwarePrDescription;
