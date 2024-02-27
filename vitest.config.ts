/* eslint-disable import/no-extraneous-dependencies */

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths({ projects: ["tsconfig.base.json"] })],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["@vitest/web-worker", "./.vitest/setupAfterEnv.ts"],
    clearMocks: true,
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp,.vscode}/**",
      "**/e2e/**",
      "**/test-utils/**",
    ],
    coverage: {
      reporter: ["lcov", "html", "text"],
      all: true,
      include: ["**/src/**/*.{ts,tsx}"],
      exclude: [
        "**/e2e/**",
        "**/node_modules/**",
        "**/stories/**",
        "**/__tests__/**",
        "**/*.spec.{ts,tsx}",
        "**/__generated__/**",
        "**/dist/**",
        "**/build/**",
        "**/*.d.ts",
        "**/.storybook/**",
        "**/test-utils/**",
      ],
    },
  },
});
