import { gql, useQuery } from "@apollo/client";
import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CompletePage from "./execution/Complete";
import FlashingStatus from "./execution/FlashingStatus";

const FlashingExecution: React.FC = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { data, subscribeToMore, error, loading } = useQuery(
    gql(/* GraphQL */ `
      query FlashJobStatus($jobId: ID!) {
        flashJobStatus(jobId: $jobId) {
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
          jobId: jobId ?? "",
        },
        onError: (error) => {
          console.log(error);
        },
        updateQuery: (_, { subscriptionData }) => {
          return {
            flashJobStatus: subscriptionData.data.flashJobStatusUpdates,
          };
        },
      });
    }
  }, [jobId, subscribeToMore]);

  useEffect(() => {
    if (
      !jobId ||
      (!loading && !data?.flashJobStatus) ||
      error ||
      data?.flashJobStatus?.cancelled
    ) {
      // this job doesn't exist
      navigate("/flash", { replace: true });
    }
  }, [jobId, loading, data, error]);

  if (!data?.flashJobStatus) {
    return null;
  }

  if (!data.flashJobStatus.stages.flash.completed) {
    return <FlashingStatus state={data.flashJobStatus.stages} />;
  }

  return <CompletePage />;
};

export default FlashingExecution;
