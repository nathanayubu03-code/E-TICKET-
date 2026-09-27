import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from './env';

// AES-256-GCM pour les données sensibles au repos (numéros de reversement des organisateurs).
// Format : base64(iv[12] | tag[16] | chiffré).
const cle = () => Buffer.from(env().ENCRYPTION_KEY, 'base64');

export function chiffrer(clair: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', cle(), iv);
  const chiffre = Buffer.concat([c.update(clair, 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), chiffre]).toString('base64');
}

export function dechiffrer(donnee: string): string {
  const b = Buffer.from(donnee, 'base64');
  const d = createDecipheriv('aes-256-gcm', cle(), b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8');
}
