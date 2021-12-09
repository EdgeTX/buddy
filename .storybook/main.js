module.exports = {
  stories: [
    "../src/renderer/stories/*.stories.mdx",
    "../src/renderer/stories/*.stories.@(js|jsx|ts|tsx)",
  ],
  addons: ["@storybook/addon-links", "@storybook/addon-essentials"],
  core: {
    builder: "webpack5",
  },
  framework: "@storybook/react",
  webpackFinal: (config) => {
    config.resolve.modules = [...(config.resolve.modules || []), "./src"];

    return config;
  },
};
