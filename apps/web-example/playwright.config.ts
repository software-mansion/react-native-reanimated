import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:8081',
  },
  webServer: {
    command: 'yarn start',
    url: 'http://localhost:8081',
    reuseExistingServer: true,
  },
  // Retry failed tests once in CI
  retries: process.env.CI ? 1 : 0,
});
