const { convertTsConfig } = require("tsconfig-to-swcconfig");
const tsconfig = require("./tsconfig.base.json");
const swcConfig = convertTsConfig(
  {
    ...tsconfig.compilerOptions,
    target: "es2022",
  },
  {
    module: {
      type: "es6",
    },
    jsc: {
      transform: {
        hidden: {
          jest: true,
        },
      },
    },
    minify: false,
  }
);

module.exports = {
  resolver: "./.jest/esmHackResolver",
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  clearMocks: true,
  setupFilesAfterEnv: ["./.jest/setupAfterEnv.ts", "jest-localstorage-mock"],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/build/",
    "/storybook-static/",
    "/__generated__/",
    "/e2e/",
  ],
  collectCoverageFrom: [
    "**/src/**/*.{ts,tsx}",
    "!**/e2e/**",
    "!**/node_modules/**",
    "!**/stories/**",
    "!**/__generated__/**",
    "!**/dist/**",
    "!**/build/**",
    "!**/*.d.ts",
    "!**/.storybook/**",
    "!src/test-utils/**",
  ],
  modulePathIgnorePatterns: [
    "<rootDir>/e2e/",
    "<rootDir>/build/",
    "<rootDir>/dist/",
    "<rootDir>/.*/__mocks__",
  ],
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  // baseUrl
  moduleDirectories: ["node_modules", "src"],
  transformIgnorePatterns: [
    // Jest ESM bug https://github.com/apollographql/apollo-client/issues/9156
    // Doesn't play well with these packages so they need to be compiled
    "<rootDir>/node_modules/(?!(ts-invariant/process|tslib|react-router-dom))",
  ],
  transform: {
    "^.+\\.worker.tsx?$": [
      "jest-chain-transform",
      {
        transformers: [
          ["@swc/jest", swcConfig],
          [require.resolve("./.jest/workerTransform")],
        ],
      },
    ],
    "^.+\\.(t|j)sx?$": ["@swc/jest", swcConfig],
    "^.+\\.(css|styl|less|sass|scss|png|webp|jpg|ttf|woff|woff2)$":
      "jest-transform-stub",
  },
  extensionsToTreatAsEsm: [".ts", ".tsx"],
};
