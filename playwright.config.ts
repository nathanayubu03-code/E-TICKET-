import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'fr-FR',
    timezoneId: 'Africa/Kinshasa',
    launchOptions: { executablePath: process.env.PW_CHROMIUM ?? undefined },
  },
  projects: [
    { name: 'e2e', testDir: 'tests/e2e' },
    { name: 'captures', testDir: 'tests/captures' },
  ],
  webServer: [
    {
      // Serveur de développement : la simulation de paiement et de SMS est interdite en production.
      command: `npx next dev -p ${PORT}`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: true,
      timeout: 180_000,
      env: { DATABASE_URL: process.env.E2E_DATABASE_URL ?? 'postgresql://eticket:eticket@localhost:5432/eticket_test', NEXT_DIST_DIR: '.next-e2e' },
    },
    {
      command: 'python3 -m http.server 3200 -d design/maquette',
      url: 'http://localhost:3200/index.html',
      reuseExistingServer: true,
    },
  ],
});
