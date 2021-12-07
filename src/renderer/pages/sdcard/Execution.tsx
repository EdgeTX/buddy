import { gql, useMutation, useQuery } from "@apollo/client";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import StepContent from "@mui/material/StepContent";
import Button from "@mui/material/Button";
import React, { useEffect, useLayoutEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ProgressWithLabel from "renderer/components/ProgressWithLabel";
import config from "shared/config";

const SdcardWriteExecution: React.FC = () => {
  const { jobId } = useParams();
  const logBoxRef = useRef<HTMLElement | null>(null);
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
        onError: (subscriptionError) => {
          console.log(subscriptionError);
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
      navigate("/sdcard", { replace: true });
    }
  }, [jobId, loading, jobCancelled, error, jobExists, navigate]);

  const [cancelJob] = useMutation(
    gql(/* GraphQL */ `
      mutation CancelSdcardJob($jobId: ID!) {
        cancelSdcardWriteJob(jobId: $jobId)
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

  const writes = [
    ...(data?.sdcardWriteJobStatus?.stages.write.writes.filter(
      (write) => write.startTime
    ) ?? []),
  ];
  writes.sort((w1, w2) => Number(w1.startTime) - Number(w2.startTime));
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

  const includesErase = !!data.sdcardWriteJobStatus.stages.erase;
  const steps = includesErase
    ? (["download", "erase", "write"] as const)
    : (["download", "write"] as const);

  const activeStep = steps.findIndex((step) => {
    const stage = data.sdcardWriteJobStatus?.stages[step];

    return stage && !stage.completed;
  });

  return (
    <Box sx={{ maxWidth: 400 }}>
      <Stepper
        activeStep={activeStep > -1 ? activeStep : steps.length}
        orientation="vertical"
      >
        {[
          {
            label: "Download",
            data: data.sdcardWriteJobStatus.stages.download,
          },
          {
            label: "Erase",
            data: data.sdcardWriteJobStatus.stages.erase,
          },
          {
            label: "Write",
            data: data.sdcardWriteJobStatus.stages.write,
          },
        ]
          .filter((stage) => stage.data)
          .map((stage) => (
            <Step key={stage.label}>
              <StepLabel>{stage.label}</StepLabel>
              <StepContent>
                <Box sx={{ mb: 2 }}>
                  <ProgressWithLabel value={stage.data?.progress ?? 0} />
                </Box>
                {stage.label === "Write" && (
                  <Box
                    ref={logBoxRef}
                    height="300px"
                    width="100%"
                    bgcolor="#e0e0e0"
                    sx={{ overflowY: "scroll", p: 2 }}
                  >
                    {logs.map((log) => (
                      <Typography sx={{ fontSize: "12px" }} key={log.id}>
                        {log.line}
                      </Typography>
                    ))}
                  </Box>
                )}
              </StepContent>
            </Step>
          ))}
      </Stepper>
      {activeStep === -1 ? (
        <Typography>Completed</Typography>
      ) : (
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
      )}
    </Box>
  );
};

export default SdcardWriteExecution;
