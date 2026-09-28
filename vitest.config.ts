import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const TEST_DB = process.env.TEST_DATABASE_URL ?? 'postgresql://eticket:eticket@localhost:5432/eticket_test';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 120_000,
    fileParallelism: false,
    globalSetup: ['tests/unit/global-setup.ts'],
    env: {
      DATABASE_URL: TEST_DB,
      APP_ENV: 'development',
      SESSION_SECRET: 'test-secret-de-session-assez-long-pour-les-tests',
      ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
      CRON_SECRET: 'test-cron-secret-assez-long-123',
      PAYMENT_PROVIDER: 'simulation',
      SMS_PROVIDER: 'simulation',
      STORAGE_DRIVER: 'local',
      STORAGE_LOCAL_DIR: 'test-results/stockage',
      SIMULATION_WEBHOOK_SECRET: 'secret-webhook-simulation-tests',
    },
  },
});
