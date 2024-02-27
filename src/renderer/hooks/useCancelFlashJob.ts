import { useMutation } from "@apollo/client";
import gql from "gql";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default (jobId?: string) => {
  const [cancelJob] = useMutation(
    gql(`
      mutation CancelFlashJob($jobId: ID!) {
        cancelFlashJob(jobId: $jobId)
      }
    `),
    {
      variables: {
        jobId: jobId ?? "",
      },
    }
  );

  return cancelJob;
};
