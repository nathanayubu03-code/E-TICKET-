import 'dotenv/config';
import { defineConfig } from '@playwright/test';

// Tests sur le build de production (service worker actif). Le test démarre et arrête lui-même
// le serveur (`next start`) : l'arrêter est la seule vraie coupure réseau pour un service worker.
// Aucun fournisseur de simulation : la production refuse de démarrer avec eux.
const PORT = 3300;
const E2E_DB = process.env.E2E_DATABASE_URL ?? 'postgresql://eticket:eticket@localhost:5432/eticket_e2e';
process.env.DATABASE_URL = E2E_DB;

export default defineConfig({
  testDir: 'tests/pwa',
  timeout: 90_000,
  workers: 1,
  reporter: [['list']],
  globalSetup: './tests/e2e/global-setup.ts',
  use: { baseURL: `http://localhost:${PORT}`, locale: 'fr-FR', timezoneId: 'Africa/Kinshasa', serviceWorkers: 'allow' },
});
