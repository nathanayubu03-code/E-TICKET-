import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';

// Étape intermédiaire de la connexion d'administration : mot de passe validé, OTP attendu.
const COOKIE = 'et_admin_attente';
const DUREE_MS = 10 * 60_000;
const signer = (v: string) => createHmac('sha256', env().SESSION_SECRET).update(`attente:${v}`).digest('base64url');

export async function poserAttente(userId: string) {
  const valeur = `${userId}.${Date.now() + DUREE_MS}`;
  (await cookies()).set(COOKIE, `${valeur}.${signer(valeur)}`, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/admin', maxAge: DUREE_MS / 1000 });
}

export async function lireAttente(): Promise<string | null> {
  const brut = (await cookies()).get(COOKIE)?.value;
  if (!brut) return null;
  const [id, exp, sig] = brut.split('.');
  if (!id || !exp || !sig || Number(exp) < Date.now()) return null;
  const attendu = Buffer.from(signer(`${id}.${exp}`));
  const recu = Buffer.from(sig);
  return attendu.length === recu.length && timingSafeEqual(attendu, recu) ? id : null;
}

export async function effacerAttente() {
  (await cookies()).delete({ name: COOKIE, path: '/admin' });
}
