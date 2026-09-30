import { defineConfig, devices } from "@playwright/test";

// Runs against the deployed admin site (ADMIN_BASE_URL overrides). Never signs in with the owner's Google account:
// the admin path uses a disposable user created with the service role and allowlisted for the run only.
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: process.env.ADMIN_BASE_URL ?? "https://sprout-admin-minjae.vercel.app", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "iphone", use: { ...devices["iPhone 15"], browserName: "chromium" } },
  ],
});
