import { defineConfig } from '@playwright/test';

const HOST = '127.0.0.1';
// The port is picked automatically by `scripts/run-e2e.mjs` (a currently-free
// one) and passed via EXPO_WEB_PORT so every Playwright process agrees on it.
// Falls back to 8099 when `playwright test` is invoked directly - still off
// Metro's default 8081, so a foreign dev server is never reused by accident.
const PORT = process.env.EXPO_WEB_PORT ?? '8099';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: `http://${HOST}:${PORT}`,
  },
  webServer: {
    command: `yarn expo start --web --port ${PORT}`,
    url: `http://${HOST}:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  // Retry failed tests once in CI
  retries: process.env.CI ? 1 : 0,
});
