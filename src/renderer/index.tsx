import "antd/dist/antd.variable.min.css";
import "./index.css";
import React, { Suspense } from "react";
import ReactDOM from "react-dom";
import { ApolloProvider } from "@apollo/client";
import { message } from "antd";
import config from "shared/config";
import { I18nextProvider } from "react-i18next";
import client from "./gql/client";
import App from "./App";
import { setupTracking } from "./tracking";
import AntProvider from "./AntProvider";
import i18n from "./i18n/config";
import { BaseLayout } from "./Layout";

message.config({
  top: 64,
});

if (config.isProduction && !config.isE2e) {
  setupTracking();
}

ReactDOM.render(
  <React.StrictMode>
    <Suspense fallback={<BaseLayout />}>
      <I18nextProvider i18n={i18n}>
        <AntProvider>
          <ApolloProvider client={client}>
            <App />
          </ApolloProvider>
        </AntProvider>
      </I18nextProvider>
    </Suspense>
  </React.StrictMode>,
  document.getElementById("root")
);
