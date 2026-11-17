import { PaperClipOutlined } from "@ant-design/icons";
import { Result } from "antd";
import React from "react";

const BackupFileSummary: React.FC<
  { name: string; hideIcon?: boolean } & Parameters<typeof Result>[0]
> = ({ name, hideIcon, ...rest }) => (
  <Result
    style={{
      padding: 0,
    }}
    icon={hideIcon ? <div /> : <PaperClipOutlined />}
    title={name}
    // eslint-disable-next-line react/jsx-props-no-spreading
    {...rest}
  />
);

export default BackupFileSummary;
