module.exports = {
  config: {
    preset: "ts-jest",
    resetMocks: true,
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
      // The boostrap worker files are not possible
      // to compile due to `import.meta.url`
      "!**/src/workers/*.bootstrap.{ts,tsx}",
    ],
    modulePathIgnorePatterns: [
      "<rootDir>/e2e/",
      "<rootDir>/build/",
      "<rootDir>/dist/",
      "<rootDir>/.*/__mocks__",
    ],
    testEnvironment: "node",
  },
};
