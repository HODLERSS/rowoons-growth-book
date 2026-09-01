import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["list"], ["json", { outputFile: "qa/e2e-results.json" }]] : [["list"], ["json", { outputFile: "qa/e2e-results.json" }]],
  timeout: 30_000,
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run start",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 90_000,
      },
  projects: [
    { name: "iphone", use: { ...devices["iPhone 15"], browserName: "chromium" } },
    { name: "iphone-webkit", use: { ...devices["iPhone 15"] } },
    { name: "iphone-dark", use: { ...devices["iPhone 15"], browserName: "chromium", colorScheme: "dark" } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
});
