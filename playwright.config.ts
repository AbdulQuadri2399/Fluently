import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
import { config } from "dotenv";

config({ path: ".env.local" });

const PORT = Number(process.env.E2E_PORT ?? 3100);
// The hidden browser that renders emails (04 D38): locally the pre-installed one.
const CHROME =
  process.env.CHROMIUM_EXECUTABLE_PATH ??
  ["/opt/pw-browsers/chromium-1243/chrome-linux64/chrome"].find((p) => existsSync(p));

export default defineConfig({
  testDir: "e2e",
  outputDir: "test-results",
  fullyParallel: false,
  // Two browsers at a time locally: more overloads this machine and makes timing-based checks flaky.
  workers: process.env.CI ? 1 : 2,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "off" },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: `pnpm build && pnpm start -p ${PORT}`,
    url: `http://localhost:${PORT}/sign-in`,
    env: CHROME ? { CHROMIUM_EXECUTABLE_PATH: CHROME } : {},
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
