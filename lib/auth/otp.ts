import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { db, type ObjetOtp } from '@/lib/db';
import { env, estStaging } from '@/lib/env';
import { limiter } from '@/lib/limites';
import { smsCodeOtp } from '@/lib/sms/gabarits';
import { envoyerSms } from '@/lib/sms';

export const OTP_DUREE_MS = 5 * 60_000;
export const OTP_ESSAIS_MAX = 5;
export const OTP_RENVOI_S = 45;

const hacher = (telephone: string, code: string) => createHmac('sha256', env().SESSION_SECRET).update(`otp:${telephone}:${code}`).digest('hex');

// codeTest : renvoyé seulement en staging (version de test), pour l'afficher sous le champ. Jamais en production.
export type ResultatEnvoiOtp = { ok: true; renvoiDans: number; codeTest?: string } | { ok: false; raison: 'trop_tot' | 'trop_de_demandes' | 'sms_indisponible'; renvoiDans?: number };

/** Envoie un code à 6 chiffres. Renvoi possible après 45 s, 5 codes par heure et par numéro. */
export async function envoyerOtp(telephone: string, objet: ObjetOtp, ip: string, langue?: string): Promise<ResultatEnvoiOtp> {
  const dernier = await db.otpCode.findFirst({ where: { telephone, objet }, orderBy: { creeLe: 'desc' } });
  if (dernier) {
    const ecoule = (Date.now() - dernier.creeLe.getTime()) / 1000;
    if (ecoule < OTP_RENVOI_S) return { ok: false, raison: 'trop_tot', renvoiDans: Math.ceil(OTP_RENVOI_S - ecoule) };
  }
  if (!(await limiter(`otp:tel:${telephone}`, 5, 3600)).ok || !(await limiter(`otp:ip:${ip}`, 20, 3600)).ok) {
    return { ok: false, raison: 'trop_de_demandes' };
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await db.otpCode.updateMany({ where: { telephone, objet, utiliseLe: null }, data: { utiliseLe: new Date() } });
  await db.otpCode.create({ data: { telephone, objet, codeHash: hacher(telephone, code), expireLe: new Date(Date.now() + OTP_DUREE_MS) } });
  const envoye = await envoyerSms(telephone, 'otp', smsCodeOtp(code, langue), { masquer: true });
  if (!envoye) return { ok: false, raison: 'sms_indisponible' };
  return { ok: true, renvoiDans: OTP_RENVOI_S, ...(estStaging() ? { codeTest: code } : {}) };
}

export type ResultatVerification = { ok: true } | { ok: false; raison: 'faux'; restants: number } | { ok: false; raison: 'expire' };

/** Vérifie le dernier code valide : 5 essais maximum, 5 minutes, usage unique. */
export async function verifierOtp(telephone: string, objet: ObjetOtp, code: string): Promise<ResultatVerification> {
  const otp = await db.otpCode.findFirst({ where: { telephone, objet, utiliseLe: null, expireLe: { gt: new Date() } }, orderBy: { creeLe: 'desc' } });
  if (!otp || otp.essais >= OTP_ESSAIS_MAX) return { ok: false, raison: 'expire' };
  // Incrément conditionnel avant comparaison : deux essais simultanés ne dépassent pas la limite.
  const pris = await db.otpCode.updateMany({ where: { id: otp.id, essais: { lt: OTP_ESSAIS_MAX }, utiliseLe: null }, data: { essais: { increment: 1 } } });
  if (pris.count === 0) return { ok: false, raison: 'expire' };
  const attendu = Buffer.from(otp.codeHash, 'hex');
  const recu = Buffer.from(hacher(telephone, code.replace(/\D/g, '')), 'hex');
  if (attendu.length === recu.length && timingSafeEqual(attendu, recu)) {
    const utilise = await db.otpCode.updateMany({ where: { id: otp.id, utiliseLe: null }, data: { utiliseLe: new Date() } });
    return utilise.count === 1 ? { ok: true } : { ok: false, raison: 'expire' };
  }
  const restants = OTP_ESSAIS_MAX - (otp.essais + 1);
  return restants > 0 ? { ok: false, raison: 'faux', restants } : { ok: false, raison: 'expire' };
}
