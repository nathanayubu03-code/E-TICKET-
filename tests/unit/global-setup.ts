import { execSync } from 'node:child_process';

// Base de test recréée à chaque lancement : migrations appliquées sur un schéma vide.
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? 'postgresql://eticket:eticket@localhost:5432/eticket_test';
  execSync('npx prisma migrate reset --force', { stdio: 'pipe', env: { ...process.env, DATABASE_URL: url, PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: 'oui' } });
}
