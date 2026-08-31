import path from "path";
import { defineConfig } from "vitest/config";

// Kept separate from vite.config.ts so the react-router / netlify / PWA
// plugins never boot for the test run, and so `react-router build` (which
// reads only vite.config.ts) can't be affected by test config.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
