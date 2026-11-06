import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "python3 -m http.server 4173 --bind 127.0.0.1 --directory .test-site",
    url: "http://127.0.0.1:4173/preview/",
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },
});
