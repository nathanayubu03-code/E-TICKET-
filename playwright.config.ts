import 'dotenv/config';
import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3100);
const PORT_STAGING = Number(process.env.E2E_PORT_STAGING ?? 3101);
const E2E_DB = process.env.E2E_DATABASE_URL ?? 'postgresql://eticket:eticket@localhost:5432/eticket_e2e';
// Les tests écrivent directement dans la base e2e (création d'événements) : même URL que le serveur.
process.env.DATABASE_URL = E2E_DB;

export default defineConfig({
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  globalSetup: './tests/e2e/global-setup.ts',
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'fr-FR',
    timezoneId: 'Africa/Kinshasa',
    launchOptions: { executablePath: process.env.PW_CHROMIUM ?? undefined },
  },
  projects: [
    { name: 'e2e', testDir: 'tests/e2e' },
    { name: 'captures', testDir: 'tests/captures' },
    // Version de test (APP_ENV=staging) : bandeau rouge, codes SMS affichés à l'écran.
    { name: 'staging', testDir: 'tests/staging', use: { baseURL: `http://localhost:${PORT_STAGING}` } },
  ],
  webServer: [
    {
      // Serveur de développement : la simulation de paiement et de SMS est interdite en production.
      command: `npx next dev -p ${PORT}`,
      url: `http://localhost:${PORT}/api/sante`,
      reuseExistingServer: true,
      timeout: 180_000,
      env: { DATABASE_URL: E2E_DB, NEXT_DIST_DIR: '.next-e2e', PAYMENT_PROVIDER: 'simulation', SMS_PROVIDER: 'simulation', APP_ENV: 'development', SIMULATION_WEBHOOK_SECRET: 'secret-webhook-simulation-e2e', CONTACT_ORGANISATEURS_EMAIL: '', CONTACT_ORGANISATEURS_TELEPHONE: '' },
    },
    {
      command: `npx next dev -p ${PORT_STAGING}`,
      url: `http://localhost:${PORT_STAGING}/api/sante`,
      reuseExistingServer: true,
      timeout: 180_000,
      env: { DATABASE_URL: E2E_DB, NEXT_DIST_DIR: '.next-staging', PAYMENT_PROVIDER: 'simulation', SMS_PROVIDER: 'simulation', APP_ENV: 'staging', SIMULATION_WEBHOOK_SECRET: 'secret-webhook-simulation-e2e', CONTACT_ORGANISATEURS_EMAIL: '', CONTACT_ORGANISATEURS_TELEPHONE: '' },
    },
    {
      command: 'python3 -m http.server 3200 -d design/maquette',
      url: 'http://localhost:3200/index.html',
      reuseExistingServer: true,
    },
  ],
});
