/* eslint-disable import/no-extraneous-dependencies */
/// <reference types="vitest" />
/// <reference types="vite/client" />

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths({ projects: ["tsconfig.base.json"] })],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["@vitest/web-worker", "./.jest/setupAfterEnv.ts"],
    clearMocks: true,
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp,.vscode}/**",
      "**/e2e/**",
      "**/test-utils/**",
    ],
  },
});
