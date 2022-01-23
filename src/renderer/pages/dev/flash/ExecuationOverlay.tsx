import React, { useEffect } from "react";
import useFlashJobStatus from "renderer/hooks/useFlashJobStatus";

import FlashJobTimeline from "renderer/components/flashing/FlashJobTimeline";
import styled, { css } from "styled-components";
import { Button, Card, Skeleton } from "antd";
import { FullHeightCentered, FullHeight } from "renderer/shared/layouts";
import useCancelFlashJob from "renderer/hooks/useCancelFlashJob";

const Outside = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
`;

const Container = styled.div`
  position: absolute;
  display: flex;
  z-index: 10;
  height: 100%;
  width: 100%;
  pointer-events: none;
  flex-direction: row;

  // In electron and smaller screens this comes from the left
  @media screen and (max-width: 1200px) {
    flex-direction: row-reverse;
  }
`;

const Overlay = styled.div<{ visible: boolean }>`
  height: 100%;
  flex: 1;
  transition: opacity 0.5s;
  background-color: white;
  ${({ visible }) =>
    visible
      ? css`
          opacity: 0.7;
          pointer-events: all;
        `
      : css`
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
        `}
`;

const ExecutionOverlay: React.FC<{ jobId?: string; onClose: () => void }> = ({
  jobId,
  onClose,
  children,
}) => {
  const { data, loading, jobCompleted, jobExists, jobCancelled, jobError } =
    useFlashJobStatus(jobId);
  const cancelJob = useCancelFlashJob(jobId);

  const active =
    !!jobId &&
    (loading || (jobExists && !jobCompleted && !jobCancelled && !jobError));

  useEffect(() => {
    if (jobId && !jobExists && !loading) {
      onClose();
    }
  }, [jobId, jobExists, onClose, loading]);

  return (
    <Outside>
      <Container>
        <Overlay
          visible={!!jobId}
          onClick={() => {
            if (!active) {
              onClose();
            }
          }}
        />
        <Card
          style={{
            width: jobId ? "400px" : "0px",
            overflow: "hidden",
            visibility: !jobId ? "hidden" : undefined,
            opacity: !jobId ? "0" : undefined,
            pointerEvents: "all",
            transition: "width 0.3s",
          }}
          bodyStyle={{
            height: "100%",
          }}
        >
          <FullHeightCentered style={{ width: "350px" }}>
            <FullHeight>
              {data?.flashJobStatus && (
                <FullHeightCentered>
                  <FlashJobTimeline state={data.flashJobStatus.stages} />
                </FullHeightCentered>
              )}
              {loading && !data?.flashJobStatus && (
                <Skeleton paragraph={{ rows: 3 }} />
              )}
            </FullHeight>
            <div>
              {active && (
                <Button
                  onClick={() => {
                    cancelJob().catch(() => {});
                    onClose();
                  }}
                >
                  Cancel
                </Button>
              )}
              {!active && (
                <Button
                  onClick={() => {
                    onClose();
                  }}
                >
                  Done
                </Button>
              )}
            </div>
          </FullHeightCentered>
        </Card>
      </Container>
      {children}
    </Outside>
  );
};

export default ExecutionOverlay;
