import { gql, useApolloClient } from "@apollo/client";
import * as base64ArrayBuffer from "base64-arraybuffer";
import { decodePrVersion, isPrVersion } from "shared/tools";

/**
 * Fetches raw firmware bytes for a Cloud release or PR build target,
 * mirroring the queries DownloadFirmwareButton uses to fetch data for
 * saving to disk. Used by the splash editor to pull down firmware for a
 * not-yet-locally-registered target before it can be patched.
 */
const useFetchFirmwareData = (): {
  fetchFirmwareData: (
    version: string,
    target: string
  ) => Promise<ArrayBuffer | undefined>;
} => {
  const client = useApolloClient();

  const fetchFirmwareData = async (
    version: string,
    target: string
  ): Promise<ArrayBuffer | undefined> => {
    const isPr = isPrVersion(version);
    const { prId, commitId } = decodePrVersion(version);

    if (isPr && prId && commitId) {
      const response = await client.query({
        query: gql(/* GraphQL */ `
          query PrBuildFirmwareDataForSplash(
            $prId: ID!
            $commitId: ID!
            $target: ID!
          ) {
            edgeTxPr(id: $prId) {
              id
              commit(id: $commitId) {
                id
                firmwareBundle {
                  id
                  target(code: $target) {
                    id
                    base64Data
                  }
                }
              }
            }
          }
        `),
        variables: { prId, commitId, target },
      });
      const fileData =
        response.data.edgeTxPr?.commit?.firmwareBundle?.target?.base64Data;
      return fileData ? base64ArrayBuffer.decode(fileData) : undefined;
    }

    const response = await client.query({
      query: gql(/* GraphQL */ `
        query ReleaseFirmwareDataForSplash($version: ID!, $target: ID!) {
          edgeTxRelease(id: $version) {
            id
            firmwareBundle {
              id
              target(code: $target) {
                id
                base64Data
              }
            }
          }
        }
      `),
      variables: { target, version },
    });
    const fileData =
      response.data.edgeTxRelease?.firmwareBundle.target?.base64Data;
    return fileData ? base64ArrayBuffer.decode(fileData) : undefined;
  };

  return { fetchFirmwareData };
};

export default useFetchFirmwareData;
