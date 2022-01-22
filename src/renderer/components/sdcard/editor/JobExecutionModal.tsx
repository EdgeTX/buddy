import { gql, useMutation, useQuery } from "@apollo/client";
import { Typography } from "antd";
import React, { useEffect, useLayoutEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import useSorted from "renderer/hooks/useSorted";
import JobStatusModal from "./JobStatusModal";

type Props = {
  jobId: string;
  onCompleted?: () => void;
  onCancelled?: () => void;
};

const JobExecutionModal: React.FC<Props> = ({
  jobId,
  onCompleted,
  onCancelled,
}) => {
  const logBoxRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const { data, subscribeToMore, error, loading } = useQuery(
    gql(/* GraphQL */ `
      query SdcardJobStatus($jobId: ID!) {
        sdcardWriteJobStatus(jobId: $jobId) {
          id
          cancelled
          stages {
            download {
              ...SdcardWriteJobStageData
            }
            erase {
              ...SdcardWriteJobStageData
            }
            write {
              started
              completed
              progress
              error
              writes {
                startTime
                completedTime
                name
              }
            }
          }
        }
      }

      fragment SdcardWriteJobStageData on SdcardWriteJobStage {
        started
        completed
        progress
        error
      }
    `),
    {
      variables: {
        jobId,
      },
      fetchPolicy: "cache-and-network",
    }
  );

  useEffect(() => {
    if (jobId) {
      subscribeToMore({
        document: gql(/* GraphQL */ `
          subscription SdcardJobUpdates($jobId: ID!) {
            sdcardWriteJobUpdates(jobId: $jobId) {
              id
              cancelled
              stages {
                download {
                  ...SdcardWriteJobStageData
                }
                erase {
                  ...SdcardWriteJobStageData
                }
                write {
                  started
                  completed
                  progress
                  error
                  writes {
                    startTime
                    completedTime
                    name
                  }
                }
              }
            }
          }

          fragment SdcardWriteJobStageData on SdcardWriteJobStage {
            started
            completed
            progress
            error
          }
        `),
        variables: {
          jobId,
        },
        updateQuery: (_, { subscriptionData }) => ({
          sdcardWriteJobStatus: subscriptionData.data.sdcardWriteJobUpdates,
        }),
      });
    }
  }, [jobId, subscribeToMore]);

  const jobCancelled = data?.sdcardWriteJobStatus?.cancelled;
  const jobExists = data?.sdcardWriteJobStatus;
  const jobCompleted = data?.sdcardWriteJobStatus?.stages.write.completed;

  useEffect(() => {
    if (!jobId || (!loading && !jobExists) || error || jobCancelled) {
      // this job doesn't exist or has now been cancelled
      navigate("/sdcardv1", { replace: true });
    }
  }, [jobId, loading, jobCancelled, error, jobExists, navigate]);

  const [cancelJob] = useMutation(
    gql(/* GraphQL */ `
      mutation CancelSdcardJob($jobId: ID!) {
        cancelSdcardWriteJob(jobId: $jobId)
      }
    `),
    {
      variables: {
        jobId,
      },
      onError: (e) => {
        console.error("Error cancelling job", e);
      },
    }
  );

  // const isRunning = !!(jobId && !error && !jobCancelled && !jobCompleted);

  // or give them a prompt if they try to leave the page during flashing
  // (outside of electron)
  //   useEffect(() => {
  //     if (isRunning) {
  //       const beforeUnload = (e: BeforeUnloadEvent): void => {
  //         e.preventDefault();
  //         e.returnValue = "";
  //       };

  //       if (!config.isElectron) {
  //         window.addEventListener("beforeunload", beforeUnload);
  //       }

  //       return () => {
  //         window.removeEventListener("beforeunload", beforeUnload);
  //       };
  //     }
  //     return undefined;
  //   }, [isRunning]);

  // Cancel the job if the user navigates away (unrenders the component)
  useEffect(
    () => () => {
      void cancelJob();
    },
    [jobId, cancelJob]
  );

  useEffect(() => {
    if (jobCompleted) {
      onCompleted?.();
    } else if (jobCancelled) {
      onCancelled?.();
    }
  }, [onCompleted, jobCompleted, onCancelled, jobCancelled]);

  const writes = useSorted(
    data?.sdcardWriteJobStatus?.stages.write.writes.filter(
      (write) => write.startTime
    ),
    (w1, w2) => Number(w1.startTime) - Number(w2.startTime)
  );
  const logs = writes.map((write) => ({
    id: write.name,
    line: `${write.name} - ${!write.completedTime ? "WRITING..." : "DONE"}`,
  }));

  useLayoutEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  }, [logs]);

  if (!data?.sdcardWriteJobStatus) {
    return null;
  }

  const { stages } = data.sdcardWriteJobStatus;
  const includesErase = !!stages.erase;
  const steps = includesErase
    ? (["download", "erase", "write"] as const)
    : (["download", "write"] as const);

  const activeStep = steps.find((step) => {
    const stage = stages[step];

    return stage && !stage.completed;
  });

  if (!activeStep) {
    return null;
  }

  return (
    <JobStatusModal
      activeStep={activeStep}
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      stepProgress={stages[activeStep]!.progress}
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      stepError={stages[activeStep]!.error}
      stepDetails={
        activeStep === "write" && (
          <div
            ref={logBoxRef}
            style={{
              height: "300px",
              width: "100%",
              backgroundColor: "#e0e0e0",
              overflowY: "scroll",
              padding: "8px",
              fontSize: "12px",
            }}
          >
            {logs.map((log) => (
              <Typography key={log.id}>{log.line}</Typography>
            ))}
          </div>
        )
      }
      onCancel={() => {
        void cancelJob();
      }}
    />
  );
};

export default JobExecutionModal;
