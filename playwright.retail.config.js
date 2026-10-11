import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/retail',
  timeout: 30000,
  expect: { timeout: 3000 },
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5187',
    headless: true,
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5187 --strictPort',
    url: 'http://127.0.0.1:5187',
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: 'https://retail.invalid',
      VITE_SUPABASE_ANON_KEY: 'retail-test-public-key',
    },
  },
})
