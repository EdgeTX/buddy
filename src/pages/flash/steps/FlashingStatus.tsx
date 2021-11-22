import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import LinearProgress, {
  LinearProgressProps,
} from "@mui/material/LinearProgress";
import React from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import { FlashingState, FlashingStageStatus } from "../../../flashing/flash";

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
      <LinearProgressWithLabel value={status.progress} />
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
  state: { downloading, erasing, flashing, connection },
}) => (
  <Box>
    <Typography variant="h2">Progress</Typography>
    <Box sx={{ p: 2 }}>
      <ConnectionStatus status={connection} />
      {downloading && (
        <StatusCard
          preTitle="Download"
          title="Downloading"
          doneTitle="Downloaded"
          status={downloading}
        />
      )}
      {erasing && (
        <StatusCard
          preTitle="Erase"
          title="Erasing"
          doneTitle="Erased"
          status={erasing}
        />
      )}
      {flashing && (
        <StatusCard
          preTitle="Flash"
          title="Flashing"
          doneTitle="Flashed"
          status={flashing}
        />
      )}
    </Box>
  </Box>
);

export default FlashingStatus;
