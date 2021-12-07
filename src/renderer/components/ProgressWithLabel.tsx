import React from "react";
import Box from "@mui/material/Box";
import LinearProgress, {
  LinearProgressProps,
} from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";

const ProgressWithLabel: React.FC<LinearProgressProps & { value: number }> = (
  props
) => {
  const { value } = props;
  return (
    <Box sx={{ display: "flex", alignItems: "center" }}>
      <Box sx={{ width: "100%", mr: 1 }}>
        {/* eslint-disable-next-line react/jsx-props-no-spreading */}
        <LinearProgress variant="determinate" {...props} />
      </Box>
      <Box sx={{ minWidth: 35 }}>
        <Typography variant="body2" color="text.secondary">{`${(
          Math.round(value * 10) / 10
        ).toFixed(1)}%`}</Typography>
      </Box>
    </Box>
  );
};

export default ProgressWithLabel;
