import { defineConfig } from '@playwright/test';

const HOST = '127.0.0.1';
// The port is picked automatically by `scripts/run-e2e.mjs`
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
