import React from "react";
import ReactMarkdown from "markdown-to-jsx";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import Table from "@mui/material/Table";
import TableContainer from "@mui/material/TableContainer";
import Paper from "@mui/material/Paper";
import { TableHead, TableRow, TableCell, TableBody } from "@mui/material";
import { Variant } from "@mui/material/styles/createTypography";

const MarkdownParagraph: React.FC = (props) => {
  return <Typography>{props.children}</Typography>;
};

const MarkdownHeading: React.FC<{ level: number }> = (props) => {
  let variant: Variant;
  switch (props.level) {
    case 1:
      variant = "h5";
      break;
    case 2:
      variant = "h6";
      break;
    case 3:
      variant = "subtitle1";
      break;
    case 4:
      variant = "subtitle2";
      break;
    default:
      variant = "h6";
      break;
  }
  return (
    <Typography sx={{ marginTop: 2 }} gutterBottom variant={variant}>
      {props.children}
    </Typography>
  );
};

const MarkdownListItem: React.FC = (props) => {
  return (
    <li>
      <Typography component="span">{props.children}</Typography>
    </li>
  );
};

const MarkdownTable: React.FC = (props) => {
  return (
    <TableContainer component={Paper}>
      <Table size="small" aria-label="a dense table">
        {props.children}
      </Table>
    </TableContainer>
  );
};

const MarkdownTableCell: React.FC = (props) => {
  return (
    <TableCell>
      <Typography>{props.children}</Typography>
    </TableCell>
  );
};

const MarkdownTableRow: React.FC = (props) => {
  return <TableRow>{props.children}</TableRow>;
};

const MarkdownTableBody: React.FC = (props) => {
  return <TableBody>{props.children}</TableBody>;
};

const MarkdownTableHead: React.FC = (props) => {
  return <TableHead>{props.children}</TableHead>;
};

const Markdown: typeof ReactMarkdown = ((props) => {
  return (
    <ReactMarkdown
      options={{
        overrides: {
          h1: {
            component: MarkdownHeading,
            props: {
              level: 1
            },
          },
          h2: {
            component: MarkdownHeading,
            props: {
              level: 2
            },
          },
          h3: {
            component: MarkdownHeading,
            props: {
              level: 3
            },
          },
          h4: {
            component: MarkdownHeading,
            props: {
              level: 4
            },
          },
          h5: {
            component: MarkdownHeading,
            props: {
              level: 5
            },
          },
          h6: {
            component: MarkdownHeading,
            props: {
              level: 6
            },
          },
          p: MarkdownParagraph,
          a: Link,
          li: MarkdownListItem,
          table: MarkdownTable,
          th: MarkdownTableHead,
          tbody: MarkdownTableBody,
          tr: MarkdownTableRow,
          td: MarkdownTableCell,
        },
      }}
      {...props}
    />
  );
}) as typeof ReactMarkdown;

export default Markdown;
