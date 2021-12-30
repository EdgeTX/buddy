import { gql, useMutation, useQuery } from "@apollo/client";
import { Button, Divider, Result, Typography } from "antd";
import React, { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import config from "shared/config";
import styled from "styled-components";
import {
  Centered,
  FullHeight,
  FullHeightCentered,
} from "renderer/shared/layouts";
import { RocketTwoTone } from "@ant-design/icons";
import FlashJobTimeline from "./execution/FlashJobTimeline";
import FirmwareSummary from "./components/FirmwareSummary";

const Container = styled.div`
  height: 100%;
  display: flex;
  flex-direction: row;

  > * {
    transition: max-width 0.2s;
    padding: 16px;

    @media screen and (max-width: 1200px) {
      transition: max-width 0.1s;
    }
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
          paddingTop: "100px",
          textAlign: "center",
          maxWidth: jobCompleted ? "100%" : "400px",
          flex: 1,
        }}
      >
        <Centered>
          {!data?.flashJobStatus?.stages.flash.completed ? (
            <>
              <div
                style={{
                  marginBottom: "32px",
                }}
              >
                <Typography.Title level={1}>Flashing EdgeTX</Typography.Title>
                <FirmwareSummary
                  hideIcon
                  loading={loading && !data}
                  target={data?.flashJobStatus?.meta.firmware.target ?? ""}
                  version={data?.flashJobStatus?.meta.firmware.version ?? ""}
                />
              </div>
              <Typography.Text>
                Please leave this window open whilst your radio is being flashed
              </Typography.Text>
            </>
          ) : (
            <>
              <Result
                style={{ padding: 8 }}
                icon={<RocketTwoTone style={{ fontSize: 48 }} />}
                title="Your radio has been flashed with EdgeTX"
              />
              <FirmwareSummary
                hideIcon
                loading={loading && !data}
                target={data.flashJobStatus.meta.firmware.target}
                version={data.flashJobStatus.meta.firmware.version}
              />
              <Result
                style={{ padding: 8, textAlign: "center" }}
                icon={<div />}
                title={null}
              >
                <Typography.Text>
                  You may now want to{" "}
                  <Link to="/sdcard">setup your SD Card</Link>
                </Typography.Text>
              </Result>
            </>
          )}
        </Centered>
      </FullHeight>
      <Divider className="divider" type="vertical" style={{ height: "100%" }} />
      <FullHeight
        style={{
          justifyContent: "center",
          alignItems: "center",
          flex: 1,
          maxWidth: jobCompleted ? "300px" : "100%",
        }}
      >
        <FullHeightCentered
          style={{
            maxWidth: "500px",
            width: "100%",
          }}
        >
          {data?.flashJobStatus && (
            <FlashJobTimeline state={data.flashJobStatus.stages} />
          )}
        </FullHeightCentered>
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "row",
            justifyContent: "flex-end",
            flex: 0,
          }}
        >
          {jobCompleted && (
            <Button
              onClick={() => {
                navigate("/flash", { replace: true });
              }}
            >
              Done
            </Button>
          )}
          {!jobCompleted && !jobError && (
            <Button
              onClick={() => {
                void cancelJob();
              }}
            >
              Cancel
            </Button>
          )}
          {jobError && (
            <Button
              onClick={() => {
                navigate("/flash", { replace: true });
              }}
            >
              Go back
            </Button>
          )}
        </div>
      </FullHeight>
    </Container>
  );
};

export default FlashExecution;
