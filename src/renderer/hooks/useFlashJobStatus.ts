import { gql, useQuery } from "@apollo/client";
import { useEffect } from "react";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default (jobId?: string) => {
  const { data, subscribeToMore, error, loading } = useQuery(
    gql(/* GraphQL */ `
      query FlashJobStatus($jobId: ID!) {
        flashJobStatus(jobId: $jobId) {
          id
          cancelled
          meta {
            firmware {
              target
              version
            }
            deviceId
          }
          stages {
            connect {
              ...FlashJobStageData
            }
            build {
              ...FlashJobStageData
            }
            download {
              ...FlashJobStageData
            }
            erase {
              ...FlashJobStageData
            }
            flash {
              ...FlashJobStageData
            }
          }
        }
      }

      fragment FlashJobStageData on FlashStage {
        started
        completed
        progress
        error
      }
    `),
    {
      variables: {
        jobId: jobId ?? "",
      },
      skip: !jobId,
      fetchPolicy: "cache-and-network",
    }
  );

  useEffect(() => {
    if (jobId) {
      subscribeToMore({
        document: gql(/* GraphQL */ `
          subscription FlashJobUpdates($jobId: ID!) {
            flashJobStatusUpdates(jobId: $jobId) {
              id
              cancelled
              stages {
                connect {
                  ...FlashJobStageData
                }
                build {
                  ...FlashJobStageData
                }
                download {
                  ...FlashJobStageData
                }
                erase {
                  ...FlashJobStageData
                }
                flash {
                  ...FlashJobStageData
                }
              }
            }
          }

          fragment FlashJobStageData on FlashStage {
            started
            completed
            progress
            error
          }
        `),
        variables: {
          jobId,
        },
        onError: (subscriptionError) => {
          console.log(subscriptionError);
        },
        updateQuery: (existing, { subscriptionData }) => ({
          flashJobStatus: {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            ...existing.flashJobStatus!,
            ...subscriptionData.data.flashJobStatusUpdates,
          },
        }),
      });
    }
  }, [jobId, subscribeToMore]);

  const jobCancelled = data?.flashJobStatus?.cancelled;
  const jobExists = data?.flashJobStatus;
  const jobCompleted = data?.flashJobStatus?.stages.flash.completed;
  const jobError = Object.values(data?.flashJobStatus?.stages ?? {}).some(
    (stage) => stage && typeof stage !== "string" && stage.error
  );

  return {
    data,
    error,
    loading,
    jobCancelled,
    jobExists,
    jobCompleted,
    jobError,
  };
};
