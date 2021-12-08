module.exports = {
  preset: "ts-jest",
  resetMocks: true,
  setupFilesAfterEnv: ["./.jest/setupAfterEnv.ts"],
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
    // The boostrap worker files are not possible
    // to compile due to `import.meta.url`
    "!src/webworker/*.bootstrap.{ts,tsx}",
    // Top level await import in here
    "!src/renderer/gql/client.ts",
  ],
  modulePathIgnorePatterns: [
    "<rootDir>/e2e/",
    "<rootDir>/build/",
    "<rootDir>/dist/",
    "<rootDir>/.*/__mocks__",
  ],
  moduleNameMapper: {
    ky: "node-fetch",
  },
  testEnvironment: "node",
  moduleDirectories: ["node_modules", "src"],
};
