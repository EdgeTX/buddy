import "antd/dist/antd.variable.min.css";
import "../src/renderer/index.css";
import { ConfigProvider } from "antd";
import { MemoryRouter } from "react-router-dom";

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
    <ConfigProvider>
      <MemoryRouter>{story()}</MemoryRouter>
    </ConfigProvider>
  ),
];
