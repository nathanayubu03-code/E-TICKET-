import { timingSafeEqual } from 'node:crypto';
import { env } from './env';

/** Les routes planifiées exigent « Authorization: Bearer CRON_SECRET » (format de Vercel Cron). */
export function cronAutorise(req: Request): boolean {
  const recu = Buffer.from(req.headers.get('authorization') ?? '');
  const attendu = Buffer.from(`Bearer ${env().CRON_SECRET}`);
  return recu.length === attendu.length && timingSafeEqual(recu, attendu);
}
