module.exports = {
  preset: "ts-jest/presets/default-esm", // or other ESM presets
  globals: {
    "ts-jest": {
      useESM: true,
      isolatedModules: true,
      tsconfig: "./tsconfig.spec.json",
    },
  },
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
  transform: {
    "^.+\\.worker.tsx?$": "workerloader-jest-transformer",
  },
};
