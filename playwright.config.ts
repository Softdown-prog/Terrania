import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', timeout: 45_000, expect: { timeout: 12_000 },
  fullyParallel: false, workers: 1, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'retain-on-failure' },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'android', use: { ...devices['Pixel 5'] } }],
  webServer: [
    { command: 'node --experimental-strip-types server/src/main.ts', port: 18787,
      env: { PORT: '18787', ALLOWED_ORIGINS: 'http://127.0.0.1:5173' } },
    { command: 'npm run dev', url: 'http://127.0.0.1:5173', timeout: 120_000,
      env: { VITE_MULTIPLAYER_URL: 'ws://127.0.0.1:18787/ws' } },
  ],
});
