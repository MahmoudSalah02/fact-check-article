import { defineConfig, devices } from "@playwright/test";

const previewBypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const previewBypassCookie = process.env.VERCEL_BYPASS_COOKIE;

const previewProtectionHeaders: Record<string, string> | undefined =
  previewBypassSecret
    ? {
        "x-vercel-protection-bypass": previewBypassSecret,
        "x-vercel-set-bypass-cookie": "true",
      }
    : previewBypassCookie
      ? { cookie: previewBypassCookie }
      : undefined;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    extraHTTPHeaders: previewProtectionHeaders,
    trace: "on-first-retry",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "pnpm dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
