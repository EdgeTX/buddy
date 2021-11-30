import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import LinearProgress, {
  LinearProgressProps,
} from "@mui/material/LinearProgress";
import React from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";

type FlashingStageStatus = {
  progress: number;
  started: boolean;
  completed: boolean;
  error?: string | null;
};

type FlashingState = {
  connect: FlashingStageStatus;
  build?: FlashingStageStatus | null;
  download?: FlashingStageStatus | null;
  erase: FlashingStageStatus;
  flash: FlashingStageStatus;
};

type Props = {
  state: FlashingState;
};

const LinearProgressWithLabel: React.FC<
  LinearProgressProps & { value: number }
> = (props) => {
  return (
    <Box sx={{ display: "flex", alignItems: "center" }}>
      <Box sx={{ width: "100%", mr: 1 }}>
        <LinearProgress variant="determinate" {...props} />
      </Box>
      <Box sx={{ minWidth: 35 }}>
        <Typography variant="body2" color="text.secondary">{`${(
          Math.round(props.value * 10) / 10
        ).toFixed(1)}%`}</Typography>
      </Box>
    </Box>
  );
};

const StatusCard: React.FC<{
  preTitle: string;
  title: string;
  doneTitle: string;
  status: FlashingStageStatus;
}> = ({ title, preTitle, doneTitle, status }) => (
  <Accordion expanded={status.started && !status.completed}>
    <AccordionSummary>
      <Typography
        variant="h5"
        color={
          status.completed || !status.started ? "text.secondary" : undefined
        }
      >
        {!status.started && preTitle}
        {status.started && (status.completed ? doneTitle : title)}
      </Typography>
    </AccordionSummary>
    <AccordionDetails>
      {status.error ? (
        status.error
      ) : (
        <LinearProgressWithLabel value={status.progress} />
      )}
    </AccordionDetails>
  </Accordion>
);

const ConnectionStatus: React.FC<{
  status: FlashingStageStatus;
}> = ({ status: { started, completed, error } }) => (
  <Accordion expanded={(started || !!error) && !completed}>
    <AccordionSummary>
      <Typography variant="h5" color={completed ? "text.secondary" : undefined}>
        {completed ? "Connected" : "Connecting"}
      </Typography>
    </AccordionSummary>
    <AccordionDetails>{error}</AccordionDetails>
  </Accordion>
);

const FlashingStatus: React.FC<Props> = ({
  state: { download, erase, flash, connect },
}) => (
  <Box>
    <Typography variant="h2">Progress</Typography>
    <Box sx={{ p: 2 }}>
      <ConnectionStatus status={connect} />
      {download && (
        <StatusCard
          preTitle="Download"
          title="Downloading"
          doneTitle="Downloaded"
          status={download}
        />
      )}
      {
        <StatusCard
          preTitle="Erase"
          title="Erasing"
          doneTitle="Erased"
          status={erase}
        />
      }
      {
        <StatusCard
          preTitle="Flash"
          title="Flashing"
          doneTitle="Flashed"
          status={flash}
        />
      }
    </Box>
  </Box>
);

export default FlashingStatus;
