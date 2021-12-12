import "antd/dist/antd.variable.min.css";
import "./index.css";
import React from "react";
import ReactDOM from "react-dom";
import { ApolloProvider } from "@apollo/client";
import { ConfigProvider } from "antd";
import client from "./gql/client";
import App from "./App";

ReactDOM.render(
  <React.StrictMode>
    <ConfigProvider>
      <ApolloProvider client={client}>
        <App />
      </ApolloProvider>
    </ConfigProvider>
  </React.StrictMode>,
  document.getElementById("root")
);
