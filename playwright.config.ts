import { defineConfig, devices } from '@playwright/test'

const external = process.env.BASE_URL

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: external ?? 'http://localhost:4173', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'touch',
      use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true },
    },
  ],
  webServer: external
    ? undefined
    : {
        command: 'npm run build:test && npm run preview -- --port 4173 --strictPort',
        url: 'http://localhost:4173',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
