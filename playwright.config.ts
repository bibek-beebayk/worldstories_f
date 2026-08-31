import { defineConfig, devices } from "@playwright/test";

const chromeExecutable = process.env.PLAYWRIGHT_CHROME_PATH || "/usr/bin/google-chrome";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      executablePath: chromeExecutable,
      args: ["--no-sandbox"],
    },
  },
  projects: [
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Responsive/touch emulation, not a claim of real Android-device QA.
      name: "mobile-chrome-emulation",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: [
    {
      command: "node e2e/mock-api.mjs",
      port: 4174,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command:
        "VITE_API_URL=http://127.0.0.1:4174/api npm run dev -- --host 127.0.0.1 --port 4173 --force",
      url: "http://127.0.0.1:4173/read-along/test-story/track-1",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
