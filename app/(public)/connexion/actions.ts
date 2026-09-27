'use server';

import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { auditer } from '@/lib/audit';
import { envoyerOtp, verifierOtp } from '@/lib/auth/otp';
import { fermerSession, ouvrirSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { ipClient } from '@/lib/requete';
import { normaliserTelephone } from '@/lib/telephone';

export type ReponseCode = { ok: true; renvoiDans: number; codeTest?: string } | { ok: false; message: string; renvoiDans?: number };

export async function demanderCode(saisie: string, piege = ''): Promise<ReponseCode> {
  const t = await getTranslations();
  if (piege) return { ok: true, renvoiDans: 45 };
  const telephone = normaliserTelephone(saisie);
  if (!telephone) return { ok: false, message: t('telephone.invalide') };
  const r = await envoyerOtp(telephone, 'CONNEXION', await ipClient());
  if (r.ok) return r;
  if (r.raison === 'trop_tot') return { ok: true, renvoiDans: r.renvoiDans ?? 45 };
  return { ok: false, message: r.raison === 'sms_indisponible' ? t('commun.erreurInconnue') : t('commun.tropDeDemandes') };
}

export type ReponseValidation = { ok: true } | { ok: false; message: string; recommencer?: boolean };

/** Valide le code : crée le compte acheteur au premier passage et ouvre une session de 30 jours. */
export async function validerCode(saisie: string, code: string): Promise<ReponseValidation> {
  const t = await getTranslations();
  const telephone = normaliserTelephone(saisie);
  if (!telephone || !/^\d{6}$/.test(code)) return { ok: false, message: t('achat.codeExpire'), recommencer: true };
  const r = await verifierOtp(telephone, 'CONNEXION', code);
  if (!r.ok) return r.raison === 'faux' ? { ok: false, message: t('achat.codeFaux', { n: r.restants }) } : { ok: false, message: t('achat.codeExpire'), recommencer: true };
  const user = await db.user.upsert({ where: { telephone }, update: {}, create: { telephone, roles: ['ACHETEUR'] } });
  if (!user.roles.includes('ACHETEUR')) await db.user.update({ where: { id: user.id }, data: { roles: [...user.roles, 'ACHETEUR'] } });
  const ip = await ipClient();
  await ouvrirSession(user.id, { ip, userAgent: (await headers()).get('user-agent') ?? undefined });
  await auditer({ acteur: user, action: 'acheteur.connexion', entite: 'User', entiteId: user.id, ip });
  return { ok: true };
}

export async function deconnecter() {
  await fermerSession();
}
