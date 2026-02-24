import "../src/renderer/index.css";
import { ConfigProvider } from "antd";
import i18n from "../src/test-utils/i18n";
import { I18nextProvider } from "react-i18next";

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};

export const decorators = [
  (story) => (
    <I18nextProvider i18n={i18n}>
      <ConfigProvider>{story()}</ConfigProvider>
    </I18nextProvider>
  ),
];
