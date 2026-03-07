import { gql, useApolloClient } from "@apollo/client";
import { useCallback } from "react";

const createQuery = gql(/* GraphQL */ `
  query CloudFirmwareStatus($params: CloudFirmwareParams!) {
    cloudFirmware(params: $params) {
      status
      downloadUrl
    }
  }
`);

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default () => {
  const client = useApolloClient();

  return useCallback(
    (params: {
      release: string;
      target: string;
      flags: { name: string; value: string }[];
    }) => {
      const queryResult = client
        .query({
          query: createQuery,
          variables: { params },
          fetchPolicy: "network-only",
        })
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        .then((result) => result.data.cloudFirmware);
      return queryResult;
    },
    [client]
  );
};
