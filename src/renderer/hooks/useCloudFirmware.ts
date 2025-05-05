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
    (
      variables: Parameters<NonNullable<(typeof createQuery)["__apiType"]>>[0]
    ) => {
      const result = client
        .mutate({ mutation: createQuery, variables })
        .then((cloudFirmwareResult) => {
          if (cloudFirmwareResult.data) {
            return cloudFirmwareResult.data.createCloudFirmware;
          }
          throw new Error(
            cloudFirmwareResult.errors
              ?.map((error) => error.message)
              .join(",") ?? ""
          );
        });
      return result;
    },
    [client]
  );
};
