import { gql, useMutation, useQuery } from "@apollo/client";
import { Button, Divider, Typography } from "antd";
import React, { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import config from "shared/config";
import styled from "styled-components";
import { Centered, FullHeight } from "renderer/shared/layouts";
import FlashJobTimeline from "./execution/FlashJobTimeline";

const Container = styled.div`
  height: 100%;
  display: flex;
  flex-direction: row;

  > * {
    padding: 16px;
  }

  > .divider {
    flex: 0;
  }
`;

const FlashExecution: React.FC = () => {
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
  const jobError = Object.values(data?.flashJobStatus?.stages ?? {}).some(
    (stage) => stage && typeof stage !== "string" && stage.error
  );

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
    `),
    {
      variables: {
        jobId: jobId ?? "",
      },
    }
  );

  const isRunning = !!(
    jobId &&
    !error &&
    !jobCancelled &&
    !jobCompleted &&
    !jobError
  );

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

  // If we leave the page whilst the job is
  // executing
  useEffect(() => {
    if (jobId) {
      return () => {
        cancelJob().catch(() => {});
      };
    }
    return undefined;
  }, [jobId, cancelJob]);

  return (
    <Container>
      <FullHeight
        style={{
          justifyContent: "center",
          textAlign: "center",
          width: "400px",
        }}
      >
        {!data?.flashJobStatus?.stages.flash.completed ? (
          <>
            <Typography.Title level={1}>Flashing EdgeTX</Typography.Title>
            <Typography.Text>
              Please leave this window open whilst we upgrade your device
            </Typography.Text>
          </>
        ) : (
          <Typography.Title level={1}>All done!</Typography.Title>
        )}
      </FullHeight>
      <Divider className="divider" type="vertical" style={{ height: "100%" }} />
      <FullHeight
        style={{ justifyContent: "center", alignItems: "center", flex: 1 }}
      >
        <Centered
          style={{
            maxWidth: "500px",
            width: "100%",
            height: "100%",
          }}
        >
          {data?.flashJobStatus && (
            <FlashJobTimeline
              completionTip={
                <Typography.Text>
                  You may now want to{" "}
                  <Link to="/sdcard">setup your SD Card</Link>
                </Typography.Text>
              }
              state={data.flashJobStatus.stages}
            />
          )}
        </Centered>
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "row",
            justifyContent: "flex-end",
            flex: 0,
          }}
        >
          {data?.flashJobStatus?.stages.flash.completed ? (
            <Button
              onClick={() => {
                navigate("/flash", { replace: true });
              }}
            >
              Done
            </Button>
          ) : (
            <Button
              onClick={() => {
                void cancelJob();
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      </FullHeight>
    </Container>
  );
};

export default FlashExecution;
