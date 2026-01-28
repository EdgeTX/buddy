import { gql, useApolloClient } from "@apollo/client";
import { useCallback } from "react";

const createQuery = gql(/* GraphQL */ `
  mutation CreateCloudFirmware($params: CloudFirmwareParams!) {
    createCloudFirmware(params: $params) {
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
      const createResult = client
        .mutate({
          mutation: createQuery,
          variables: { params },
        })
        .then((result) => {
          if (result.data) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
            return result.data.createCloudFirmware;
          }
          throw new Error(
            result.errors?.map((error) => error.message).join(",") ?? ""
          );
        });
      return createResult;
    },
    [client]
  );
};
