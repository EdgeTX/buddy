import React, { useLayoutEffect, useRef } from "react";

const SdcardWriteExecution: React.FC = () => {
  const logBoxRef = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (logBoxRef?.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <Box
      ref={logBoxRef}
      flexGrow={1}
      overflow="scroll"
      sx={{ overflowX: "hidden" }}
    >
      {logs.map((line) => (
        <Typography>{line}</Typography>
      ))}
    </Box>
  );
};

export default SdcardWriteExecution;
