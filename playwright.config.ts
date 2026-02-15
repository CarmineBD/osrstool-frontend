import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.pw.ts",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_SUPABASE_URL: "http://127.0.0.1:54321",
      VITE_SUPABASE_ANON_KEY: "test-anon-key",
      VITE_API_URL: "http://127.0.0.1:3001",
      VITE_API_USE_PROXY: "true",
      VITE_QUERY_REFETCH_INTERVAL_MS: "1000",
    },
  },
});
