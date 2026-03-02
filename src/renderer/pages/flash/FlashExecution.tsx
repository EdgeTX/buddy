import { Button, Divider, Result, Typography } from "antd";
import React, { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import {
  Centered,
  FullHeight,
  FullHeightCentered,
} from "renderer/shared/layouts";
import { RocketTwoTone } from "@ant-design/icons";
import useIsMobile from "renderer/hooks/useIsMobile";
import useFlashJobStatus from "renderer/hooks/useFlashJobStatus";
import useCancelFlashJob from "renderer/hooks/useCancelFlashJob";
import FlashJobTimeline from "renderer/components/flashing/FlashJobTimeline";
import FirmwareSummary from "renderer/components/firmware/FirmwareSummary";
import { Trans, useTranslation } from "react-i18next";
import environment from "shared/environment";

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
  const isMobile = useIsMobile();
  const { t } = useTranslation("flashing");
  const { jobId } = useParams();
  const navigate = useNavigate();
  const {
    data,
    error,
    loading,
    jobCancelled,
    jobCompleted,
    jobExists,
    jobError,
  } = useFlashJobStatus(jobId);

  useEffect(() => {
    if (!jobId || (!loading && !jobExists) || error || jobCancelled) {
      // this job doesn't exist
      navigate("/flash", { replace: true });
    }
  }, [jobId, loading, jobExists, error, jobCancelled, navigate]);

  const cancelJob = useCancelFlashJob(jobId);

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

      if (!environment.isElectron) {
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

  const completed = data?.flashJobStatus?.stages.flash.completed;
  const firmwareSummary = (
    <FirmwareSummary
      hideIcon
      loading={loading && !data}
      target={data?.flashJobStatus?.meta.firmware.target ?? ""}
      version={data?.flashJobStatus?.meta.firmware.version ?? ""}
    />
  );

  const renderFlashResult = (): React.ReactNode => (
    <>
      <Result
        style={{ padding: 8 }}
        icon={<RocketTwoTone style={{ fontSize: 48 }} />}
        title={t(`Your radio has been flashed with EdgeTX`)}
      />
      {firmwareSummary}
      <Result
        style={{ padding: 8, textAlign: "center" }}
        icon={<div />}
        title={null}
      >
        <Typography.Text>
          <Trans t={t}>
            You may now want to <Link to="/sdcard">setup your SD Card</Link>
          </Trans>
        </Typography.Text>
      </Result>
    </>
  );

  return (
    <Container>
      {!isMobile && (
        <>
          <FullHeight
            style={{
              paddingTop: "100px",
              textAlign: "center",
              maxWidth: jobCompleted ? "100%" : "400px",
              flex: 1,
            }}
          >
            <Centered>
              {!completed ? (
                <>
                  <div
                    style={{
                      marginBottom: "32px",
                    }}
                  >
                    <Typography.Title level={1}>
                      {t(`Flashing EdgeTX`)}
                    </Typography.Title>
                    {firmwareSummary}
                  </div>
                  <Typography.Text>
                    {t(
                      `Please leave this window open whilst your radio is being flashed`
                    )}
                  </Typography.Text>
                </>
              ) : (
                renderFlashResult()
              )}
            </Centered>
          </FullHeight>
          <Divider
            className="divider"
            type="vertical"
            style={{ height: "100%" }}
          />
        </>
      )}
      <FullHeight
        style={{
          justifyContent: "center",
          alignItems: "center",
          flex: 1,
          maxWidth: jobCompleted && !isMobile ? "300px" : "100%",
        }}
      >
        <FullHeightCentered
          style={{
            maxWidth: "500px",
            width: "100%",
          }}
        >
          {data?.flashJobStatus && (!isMobile || !completed) && (
            <FlashJobTimeline
              state={data.flashJobStatus.stages}
              onSpecialErrorActionClicked={() => {
                // TODO: check what error we have experienced and act accordingly
                // for now, we know the only special error we have to deal with
                // is for protected flash
                navigate("/dev/flash/unlock");
              }}
            />
          )}
          {completed && isMobile && renderFlashResult()}
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
              {t(`Done`)}
            </Button>
          )}
          {!jobCompleted && !jobError && (
            <Button
              onClick={() => {
                void cancelJob();
              }}
            >
              {t(`Cancel`)}
            </Button>
          )}
          {jobError && (
            <Button
              onClick={() => {
                navigate("/flash", { replace: true });
              }}
            >
              {t(`Go back`)}
            </Button>
          )}
        </div>
      </FullHeight>
    </Container>
  );
};

export default FlashExecution;
