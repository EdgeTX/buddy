const webpack = require("webpack");

module.exports = {
  stories: ["../src/renderer/stories/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-links", "@storybook/addon-essentials"],
  staticDirs: ["../assets"],
  core: {
    builder: "webpack5",
  },
  framework: "@storybook/react",
  typescript: {
    reactDocgen: "react-docgen-typescript-plugin",
  },
  webpackFinal: (config) => {
    config.resolve.modules = [...(config.resolve.modules || []), "./src"];

    config.plugins.push(
      new webpack.ProvidePlugin({
        process: "process/browser",
        Buffer: ["buffer", "Buffer"],
      })
    );

    return config;
  },
};
