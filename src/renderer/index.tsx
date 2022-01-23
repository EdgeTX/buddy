import "antd/dist/antd.variable.min.css";
import "./index.css";
import React from "react";
import ReactDOM from "react-dom";
import { ApolloProvider } from "@apollo/client";
import { ConfigProvider, message } from "antd";
import client from "./gql/client";
import App from "./App";

message.config({
  top: 64,
});

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
