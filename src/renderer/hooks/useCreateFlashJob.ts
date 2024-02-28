import { useApolloClient } from "@apollo/client";
import gql from "gql";
import { useCallback, useMemo, useState } from "react";

const createQuery = gql(`
  mutation CreateFlashJob($firmware: FlashFirmwareInput!, $deviceId: ID!) {
    createFlashJob(firmware: $firmware, deviceId: $deviceId) {
      id
    }
  }
`);

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default () => {
  const client = useApolloClient();
  const [loading, setLoading] = useState(false);

  return [
    useCallback(
      (
        variables: Parameters<NonNullable<typeof createQuery["__apiType"]>>[0]
      ) => {
        setLoading(true);
        const result = client
          .mutate({ mutation: createQuery, variables })
          .then((jobCreateResult) => {
            if (jobCreateResult.data) {
              return jobCreateResult.data.createFlashJob.id;
            }
            throw new Error(
              jobCreateResult.errors?.map((error) => error.message).join(",") ??
                ""
            );
          });
        void result.finally(() => {
          setLoading(false);
        });

        return result;
      },
      [client, setLoading]
    ),
    useMemo(() => ({ loading }), [loading]),
  ] as const;
};
