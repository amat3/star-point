import { defineConfig } from '@playwright/test'

// The e2e tests only run against the DEMO database (e2e/global-setup.ts refuses anything else).
// Credentials come from .env.demo.local, which is git-ignored.
try {
  process.loadEnvFile('.env.demo.local')
} catch {
  // global setup explains what is missing
}

// Not 3000: that is where `npm run dev` lives, and Next allows a single dev server per project
const PORT = 3100

export default defineConfig({
  testDir: 'e2e',
  // The tests share one database (and publish and cancel real rows in it)
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // The Chrome already installed: nothing to download. In CI, `npx playwright install chromium` and drop this line
    channel: 'chrome',
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    viewport: { width: 430, height: 932 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // A production build, like the real thing; an already running server on this port is reused
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: true,
    timeout: 300_000,
  },
})
