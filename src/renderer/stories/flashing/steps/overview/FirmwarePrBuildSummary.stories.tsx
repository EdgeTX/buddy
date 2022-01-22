import { Card } from "antd";
import React from "react";
import FirmwarePrBuildSummary from "renderer/components/flash/components/FirmwarePrBuildSummary";
import { Centered } from "renderer/shared/layouts";

export default {
  title: "Flashing/steps/Overview/FirmwarePrBuildSummary",
  component: FirmwarePrBuildSummary,
};

export const example: React.FC = () => (
  <FirmwarePrBuildSummary
    branchName="EdgeTX:aasdasd"
    commitId="a98s0809a8s09f8a090989098as8a0s"
    targetName="FlySky Nirvana"
  />
);

export const inCard: React.FC = () => (
  <Card style={{ width: 500 }}>
    <Centered>
      <FirmwarePrBuildSummary
        branchName="EdgeTX:aasdasd"
        commitId="a98s0809a8s09f8a090989098as8a0s"
        targetName="FlySky Nirvana"
      />
    </Centered>
  </Card>
);
