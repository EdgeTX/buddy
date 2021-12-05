import { gql, useQuery } from "@apollo/client";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import StepContent from "@mui/material/StepContent";
import React, { useEffect, useLayoutEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ProgressWithLabel from "../../components/ProgressWithLabel";

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
          jobId: jobId ?? "",
        },
        onError: (error) => {
          console.log(error);
        },
        updateQuery: (_, { subscriptionData }) => {
          return {
            sdcardWriteJobStatus: subscriptionData.data.sdcardWriteJobUpdates,
          };
        },
      });
    }
  }, [jobId, subscribeToMore]);

  useEffect(() => {
    if (
      !jobId ||
      (!loading && !data?.sdcardWriteJobStatus) ||
      error ||
      data?.sdcardWriteJobStatus?.cancelled
    ) {
      console.log(jobId, loading, data, error);
      // this job doesn't exist
      // navigate("/sdcard", { replace: true });
    }
  }, [jobId, loading, data, error]);

  // const logs: string[] = [];
  // useLayoutEffect(() => {
  //   if (logBoxRef?.current) {
  //     logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
  //   }
  // }, [logs]);

  if (!data?.sdcardWriteJobStatus) {
    return null;
  }

  const includesErase = !!data.sdcardWriteJobStatus.stages.erase;
  const steps = includesErase
    ? (["download", "erase", "write"] as const)
    : (["download", "write"] as const);

  const activeStep = steps.findIndex((step) => {
    const stage = data.sdcardWriteJobStatus!.stages[step];

    return stage && !stage.completed;
  });

  return (
    <Box sx={{ maxWidth: 400 }}>
      <Stepper activeStep={activeStep} orientation="vertical">
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
          .map((stage, index) => (
            <Step key={stage.label}>
              <StepLabel>{stage.label}</StepLabel>
              <StepContent>
                <Box sx={{ mb: 2 }}>
                  <ProgressWithLabel value={stage.data?.progress ?? 0} />
                </Box>
              </StepContent>
            </Step>
          ))}
      </Stepper>
      {activeStep === -1 && <Typography>Completed</Typography>}
    </Box>
  );
};

export default SdcardWriteExecution;
