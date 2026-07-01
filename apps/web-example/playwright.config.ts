import { defineConfig } from '@playwright/test';

// Default off Metro's 8081 so the suite doesn't reuse a foreign dev server
// (a native `react-native start`, or another checkout) sitting on that port.
// Override with EXPO_WEB_PORT to run on a specific port.
const PORT = process.env.EXPO_WEB_PORT ?? '8099';
const HOST = '127.0.0.1';

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
