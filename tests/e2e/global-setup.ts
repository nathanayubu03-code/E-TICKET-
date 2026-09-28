import { execSync } from 'node:child_process';

// Base e2e recréée à chaque lancement, puis seed de production (référentiel + super-administrateur).
export default function setup() {
  const env = {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL,
    PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: 'oui',
    SUPERADMIN_TELEPHONE: '+243990000001',
    SUPERADMIN_MOT_DE_PASSE: 'MotDePasseE2E-tres-long-2026',
    SUPERADMIN_NOM: 'Admin e2e',
  };
  execSync('npx prisma migrate reset --force', { stdio: 'pipe', env });
  execSync('npx tsx prisma/seed.ts', { stdio: 'pipe', env });
}
