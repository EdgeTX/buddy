import { Story } from "@storybook/react";
import React from "react";
import JobStatusModal from "renderer/pages/sdcard/editor/JobStatusModal";

export default {
  title: "Sdcard/Execution/JobStatusModal",
  component: JobStatusModal,
};

export const downloading: Story = () => (
  <JobStatusModal activeStep="download" stepProgress={50} />
);

downloading.story = {
  parameters: {
    loki: { skip: true },
  },
};

export const erasing: Story = () => (
  <JobStatusModal activeStep="erase" stepProgress={30.234} />
);

erasing.story = {
  parameters: {
    loki: { skip: true },
  },
};

export const writing: Story = () => (
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

writing.story = {
  parameters: {
    loki: { skip: true },
  },
};
