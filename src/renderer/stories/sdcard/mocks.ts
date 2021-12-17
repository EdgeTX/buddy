import { MockedResponse } from "@apollo/client/testing";
import gql from "graphql-tag";

// eslint-disable-next-line import/prefer-default-export
export const pickSdcardDirectoryMutation = (
  isValid: boolean
): MockedResponse => ({
  request: {
    query: gql`
      mutation PickValidSdcardDirectory {
        pickSdcardDirectory {
          id
          isValid
        }
      }
    `,
  },
  result: {
    data: {
      pickSdcardDirectory: {
        id: "some-id",
        isValid,
      },
    },
  },
});
