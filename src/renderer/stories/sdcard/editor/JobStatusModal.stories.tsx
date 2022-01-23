import React from "react";
import JobStatusModal from "renderer/pages/sdcard/editor/JobStatusModal";

export default {
  title: "Sdcard/Execution/JobStatusModal",
  component: JobStatusModal,
};

export const downloading: React.FC = () => (
  <JobStatusModal activeStep="download" stepProgress={50} />
);

export const erasing: React.FC = () => (
  <JobStatusModal activeStep="erase" stepProgress={30.234} />
);

export const writing: React.FC = () => (
  <JobStatusModal
    activeStep="write"
    stepProgress={80}
    stepDetails={
      <div style={{ height: "200px", overflowY: "scroll" }}>
        <p>Something</p>
        <p>Somethign else</p>
      </div>
    }
  />
);
