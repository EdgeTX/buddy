import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import LinearProgress, {
  LinearProgressProps,
} from "@mui/material/LinearProgress";
import React from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";

type Status = {
  progress: number;
  started: boolean;
  completed: boolean;
  error?: string;
};

type Props = {
  connection: {
    connected: boolean;
    connecting: boolean;
    error?: string;
  };
  downloading?: Status;
  erasing: Status;
  flashing: Status;
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
        <Typography variant="body2" color="text.secondary">{`${Math.round(
          props.value
        )}%`}</Typography>
      </Box>
    </Box>
  );
};

const StatusCard: React.FC<{
  title: string;
  doneTitle: string;
  status: Status;
}> = ({ title, doneTitle, status }) => (
  <Accordion expanded={status.started && !status.completed}>
    <AccordionSummary>
      <Typography
        variant="h5"
        color={status.completed ? "text.secondary" : undefined}
      >
        {status.completed ? doneTitle : title}
      </Typography>
    </AccordionSummary>
    <AccordionDetails>
      <LinearProgressWithLabel value={status.progress} />
    </AccordionDetails>
  </Accordion>
);

const ConnectionStatus: React.FC<{
  connecting: boolean;
  connected: boolean;
  error?: string;
}> = ({ connecting, connected, error }) => (
  <Accordion expanded={!!(connecting || error)}>
    <AccordionSummary>
      <Typography variant="h5" color={connected ? "text.secondary" : undefined}>
        {connected ? "Connected" : "Connecting"}
      </Typography>
    </AccordionSummary>
    <AccordionDetails>{error}</AccordionDetails>
  </Accordion>
);

const FlashingStatus: React.FC<Props> = ({
  downloading,
  erasing,
  flashing,
  connection,
}) => (
  <Box>
    <Typography variant="h2">Progress</Typography>
    <ConnectionStatus {...connection} />
    {downloading && (
      <StatusCard
        title="Downloading"
        doneTitle="Downloaded"
        status={downloading}
      />
    )}
    {erasing && (
      <StatusCard title="Erasing" doneTitle="Erased" status={erasing} />
    )}
    {flashing && (
      <StatusCard title="Flashing" doneTitle="Flashed" status={flashing} />
    )}
  </Box>
);

export default FlashingStatus;
