const { convertTsConfig } = require("tsconfig-to-swcconfig");
const tsconfig = require("./tsconfig.spec.json");
const swcConfig = convertTsConfig({
  ...tsconfig.compilerOptions,
  target: "es2022",
});

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
  ],
  collectCoverageFrom: [
    "**/src/**/*.{ts,tsx}",
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
  moduleDirectories: ["node_modules", "src"],
  transformIgnorePatterns: [
    // Jest ESM bug https://github.com/apollographql/apollo-client/issues/9156
    // Doesn't play well with these packages so they need to be compiled
    "<rootDir>/node_modules/(?!(ts-invariant/process|tslib))",
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
  },
  extensionsToTreatAsEsm: [".ts", ".tsx"],
};
