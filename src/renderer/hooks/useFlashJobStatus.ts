import { gql, useQuery } from "@apollo/client";
import { exception } from "react-ga";
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
        status {
          jobStatus
          startedAt
        }
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
      const unsub = subscribeToMore({
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
            status {
              jobStatus
              startedAt
            }
          }
        `),
        variables: {
          jobId,
        },
        onError: (subscriptionError) => {
          exception({
            description: `Could not subscribe to flash job: ${subscriptionError.message}`,
            fatal: true,
          });
        },
        updateQuery: (existing, { subscriptionData }) => ({
          flashJobStatus: {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            ...existing.flashJobStatus!,
            ...subscriptionData.data.flashJobStatusUpdates,
          },
        }),
      });

      return unsub;
    }

    return undefined;
  }, [jobId, subscribeToMore]);

  const jobCancelled = !!data?.flashJobStatus?.cancelled;
  const jobExists = !!data?.flashJobStatus;
  const jobCompleted = !!data?.flashJobStatus?.stages.flash.completed;
  const jobError = (
    Object.values(data?.flashJobStatus?.stages ?? {}).find(
      (stage) => stage && typeof stage !== "string" && stage.error
    ) as { error: string } | undefined
  )?.error;

  useEffect(() => {
    if (jobError) {
      exception({
        description: `Error during flash: ${jobError}`,
        fatal: true,
      });
    }
  }, [jobError]);

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
