import { z } from 'zod';

// Variables d'environnement validées au démarrage. Aucune valeur secrète par défaut.
const vide = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const optionnel = z.preprocess(vide, z.string().optional());

export const FOURNISSEURS_PAIEMENT = ['simulation', 'non_configure'] as const;
export const FOURNISSEURS_SMS = ['simulation', 'non_configure'] as const;

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_ENV: z.preprocess(vide, z.enum(['development', 'test', 'preview', 'production']).optional()),
  DATABASE_URL: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: optionnel,
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET doit faire au moins 32 caractères'),
  ENCRYPTION_KEY: z.string().refine((v) => Buffer.from(v, 'base64').length === 32, 'ENCRYPTION_KEY doit être 32 octets encodés en base64'),
  CRON_SECRET: z.string().min(24, 'CRON_SECRET doit faire au moins 24 caractères'),
  PAYMENT_PROVIDER: z.enum(FOURNISSEURS_PAIEMENT).default('non_configure'),
  SMS_PROVIDER: z.enum(FOURNISSEURS_SMS).default('non_configure'),
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_DIR: z.preprocess(vide, z.string().default('stockage-local')),
  S3_ENDPOINT: optionnel,
  S3_REGION: z.preprocess(vide, z.string().default('auto')),
  S3_BUCKET: optionnel,
  S3_ACCESS_KEY_ID: optionnel,
  S3_SECRET_ACCESS_KEY: optionnel,
  S3_PUBLIC_URL: optionnel,
  CONTACT_ORGANISATEURS_EMAIL: z.preprocess(vide, z.email().optional()),
  CONTACT_ORGANISATEURS_TELEPHONE: optionnel,
  // Mentions légales : affichées dans Conditions et Confidentialité quand elles sont renseignées.
  EDITEUR_NOM: optionnel,
  EDITEUR_FORME: optionnel,
  EDITEUR_RCCM: optionnel,
  EDITEUR_ADRESSE: optionnel,
  CONTACT_EMAIL: z.preprocess(vide, z.email().optional()),
});

export type Env = z.infer<typeof schema>;

export function lireEnv(source: Record<string, string | undefined> = process.env): Env {
  const r = schema.safeParse(source);
  if (!r.success) {
    const details = r.error.issues.map((i) => `${i.path.join('.')} : ${i.message}`).join('\n');
    throw new Error(`Configuration invalide :\n${details}`);
  }
  return r.data;
}

/** Refuse de démarrer une production avec un fournisseur de simulation ou un stockage incomplet. */
export function verifierDemarrage(env: Env): void {
  const production = env.NODE_ENV === 'production' || env.APP_ENV === 'production';
  if (!production) return;
  if (env.PAYMENT_PROVIDER === 'simulation') {
    throw new Error('Démarrage refusé : PAYMENT_PROVIDER=simulation est interdit en production.');
  }
  if (env.SMS_PROVIDER === 'simulation') {
    throw new Error('Démarrage refusé : SMS_PROVIDER=simulation est interdit en production.');
  }
  if (env.STORAGE_DRIVER === 'local' && process.env.VERCEL) {
    console.warn('Attention : STORAGE_DRIVER=local sur Vercel. Le disque y est éphémère ; utilisez STORAGE_DRIVER=s3 (Cloudflare R2) pour les affiches.');
  }
  if (env.STORAGE_DRIVER === 's3' && !(env.S3_ENDPOINT && env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY)) {
    throw new Error('Démarrage refusé : STORAGE_DRIVER=s3 demande S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID et S3_SECRET_ACCESS_KEY.');
  }
}

let cache: Env | null = null;
export function env(): Env {
  if (!cache) cache = lireEnv();
  return cache;
}
