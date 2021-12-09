import React from "react";
import { addDecorator } from "@storybook/react";
import CssBaseline from "@mui/material/CssBaseline";

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};

addDecorator((story) => (
  <>
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap"
    />
    <CssBaseline />
    {story()}
  </>
));
