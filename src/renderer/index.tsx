import React from "react";
import ReactDOM from "react-dom";
import { ApolloProvider } from "@apollo/client";
import CssBaseline from "@mui/material/CssBaseline";
import config from "shared/config";
import { ConfigProvider } from "antd";
import App from "./App";
import client from "./gql/client";
import NextGeneration from "./Next";

ReactDOM.render(
  config.isNewUI ? (
    <React.StrictMode>
      <ConfigProvider>
        <ApolloProvider client={client}>
          <NextGeneration />
        </ApolloProvider>
      </ConfigProvider>
    </React.StrictMode>
  ) : (
    <React.StrictMode>
      <CssBaseline />
      <ApolloProvider client={client}>
        <App />
      </ApolloProvider>
    </React.StrictMode>
  ),
  document.getElementById("root")
);
