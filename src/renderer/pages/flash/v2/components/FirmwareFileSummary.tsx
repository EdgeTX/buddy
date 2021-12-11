import { PaperClipOutlined } from "@ant-design/icons";
import { Result } from "antd";
import React from "react";

const FirmwareFileSummary: React.FC<
  { name: string } & Parameters<typeof Result>[0]
> = ({ name, ...rest }) => (
  <Result
    style={{
      padding: 0,
    }}
    icon={<PaperClipOutlined />}
    title={name}
    // eslint-disable-next-line react/jsx-props-no-spreading
    {...rest}
  />
);

export default FirmwareFileSummary;
