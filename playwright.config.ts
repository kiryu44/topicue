import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env["PLAYWRIGHT_BASE_URL"] ?? "http://localhost:3001";
const devServerPort = new URL(baseURL).port || "80";
const useExistingServer = process.env["PLAYWRIGHT_SKIP_WEBSERVER"] === "1";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env["CI"] ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  ...(useExistingServer
    ? {}
    : {
        webServer: {
          command: `node node_modules/next/dist/bin/next dev --port ${devServerPort}`,
          url: baseURL,
          reuseExistingServer: !process.env["CI"],
          timeout: 120_000,
        },
      }),
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
