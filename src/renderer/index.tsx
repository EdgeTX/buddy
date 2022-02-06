import "antd/dist/antd.variable.min.css";
import "./index.css";
import React from "react";
import ReactDOM from "react-dom";
import { ApolloProvider } from "@apollo/client";
import { ConfigProvider, message } from "antd";
import config from "shared/config";
import client from "./gql/client";
import App from "./App";
import { setupTracking } from "./tracking";

message.config({
  top: 64,
});

if (!config.isElectron && config.isProduction && !config.isE2e) {
  setupTracking();
}

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
