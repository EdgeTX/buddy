import { gql, useMutation, useQuery } from "@apollo/client";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import config from "../../../shared/config";
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
          jobId,
        },
        onError: (subscriptionError) => {
          console.log(subscriptionError);
        },
        updateQuery: (_, { subscriptionData }) => ({
          flashJobStatus: subscriptionData.data.flashJobStatusUpdates,
        }),
      });
    }
  }, [jobId, subscribeToMore]);

  const jobCancelled = data?.flashJobStatus?.cancelled;
  const jobExists = data?.flashJobStatus;
  const jobCompleted = data?.flashJobStatus?.stages.flash.completed;

  useEffect(() => {
    if (!jobId || (!loading && !jobExists) || error || jobCancelled) {
      // this job doesn't exist
      navigate("/flash", { replace: true });
    }
  }, [jobId, loading, jobExists, error, jobCancelled, navigate]);

  const [cancelJob] = useMutation(
    gql(/* GraphQL */ `
      mutation CancelFlashJob($jobId: ID!) {
        cancelFlashJob(jobId: $jobId)
      }
    `)
  );

  const isRunning = !!(jobId && !error && !jobCancelled && !jobCompleted);

  // Cancel the job if the user navigates away (unrenders the component)
  // or give them a prompt if they try to leave the page during flashing
  // (outside of electron)
  useEffect(() => {
    if (isRunning) {
      const beforeUnload = (e: BeforeUnloadEvent): void => {
        e.preventDefault();
        e.returnValue = "";
      };

      if (!config.isElectron) {
        window.addEventListener("beforeunload", beforeUnload);
      }

      return () => {
        window.removeEventListener("beforeunload", beforeUnload);
      };
    }
    return undefined;
  }, [isRunning]);

  useEffect(() => {
    if (jobId) {
      return () => {
        cancelJob({
          variables: {
            jobId,
          },
        }).catch(() => {});
      };
    }
    return undefined;
  }, [jobId, cancelJob]);

  if (!data?.flashJobStatus) {
    return null;
  }

  if (!data.flashJobStatus.stages.flash.completed) {
    return (
      <Box>
        <FlashingStatus state={data.flashJobStatus.stages} />
        <Button
          onClick={() => {
            void cancelJob({
              variables: {
                jobId: jobId ?? "",
              },
            });
          }}
        >
          Cancel
        </Button>
      </Box>
    );
  }

  return <CompletePage />;
};

export default FlashingExecution;
