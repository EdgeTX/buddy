import { gql, useMutation } from "@apollo/client";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default (jobId?: string) => {
  const [cancelJob] = useMutation(
    gql(/* GraphQL */ `
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
