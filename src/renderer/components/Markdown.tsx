import React from "react";
import ReactMarkdown from "markdown-to-jsx";
import { Typography } from "antd";

const MarkdownParagraph: React.FC = ({ children }) => <p>{children}</p>;

const MarkdownHeading: React.FC<{ level: number }> = ({ children, level }) => (
  <Typography.Title level={level as never}>{children}</Typography.Title>
);

const MarkdownListItem: React.FC = ({ children }) => (
  <li>
    <Typography>{children}</Typography>
  </li>
);

const Markdown: typeof ReactMarkdown = ((props) => (
  <ReactMarkdown
    options={{
      overrides: {
        h1: {
          component: MarkdownHeading,
          props: {
            level: 1,
          },
        },
        h2: {
          component: MarkdownHeading,
          props: {
            level: 2,
          },
        },
        h3: {
          component: MarkdownHeading,
          props: {
            level: 3,
          },
        },
        h4: {
          component: MarkdownHeading,
          props: {
            level: 4,
          },
        },
        h5: {
          component: MarkdownHeading,
          props: {
            level: 5,
          },
        },
        h6: {
          component: MarkdownHeading,
          props: {
            level: 6,
          },
        },
        p: MarkdownParagraph,
        a: {
          component: Typography.Link,
          props: {
            target: "_blank",
          },
        },
        li: MarkdownListItem,
      },
    }}
    // eslint-disable-next-line react/jsx-props-no-spreading
    {...props}
  />
)) as typeof ReactMarkdown;

export default Markdown;
