import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/pilot',
  outputDir: './test-results/pilot',
  timeout: 30000,
  expect: { timeout: 5000 },
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5197',
    channel: 'chrome',
    headless: true,
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5197 --strictPort',
    url: 'http://127.0.0.1:5197',
    reuseExistingServer: false,
    env: {
      VITE_API_TARGET: 'http://127.0.0.1:9',
      VITE_SUPABASE_URL: 'https://pilot.invalid',
      VITE_SUPABASE_ANON_KEY: 'pilot-test-public-key',
    },
  },
})
