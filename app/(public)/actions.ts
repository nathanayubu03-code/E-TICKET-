'use server';

import { getTranslations } from 'next-intl/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { exigerLimites, TropDeDemandes } from '@/lib/limites';
import { estRobot, ipClient } from '@/lib/requete';
import { normaliserTelephone } from '@/lib/telephone';

export interface EtatFormulaire { ok: boolean; message?: string; erreurs?: Record<string, string> }

const schemaAlerte = z.object({
  telephone: z.string().max(32),
  ville: z.string().max(64).optional().default(''),
  consentement: z.literal('oui', { error: 'consentement' }),
});

export async function sAbonnerAlertes(_e: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  const t = await getTranslations();
  if (estRobot(formData)) return { ok: true, message: t('alertes.succes') };
  const r = schemaAlerte.safeParse(Object.fromEntries(formData));
  const telephone = normaliserTelephone(String(formData.get('telephone') ?? ''));
  const erreurs: Record<string, string> = {};
  if (!telephone) erreurs.telephone = t('telephone.invalide');
  if (!r.success && r.error.issues.some((i) => i.path[0] === 'consentement')) erreurs.consentement = t('alertes.consentementRequis');
  if (!r.success || !telephone) return { ok: false, erreurs };
  try {
    await exigerLimites([{ cle: `alerte:ip:${await ipClient()}`, max: 10, fenetre: 3600 }, { cle: `alerte:tel:${telephone}`, max: 3, fenetre: 3600 }]);
  } catch (e) {
    if (e instanceof TropDeDemandes) return { ok: false, message: t('commun.tropDeDemandes') };
    throw e;
  }
  const ville = r.data.ville ? await db.city.findUnique({ where: { slug: r.data.ville } }) : null;
  const deja = await db.smsAlertSubscription.findFirst({ where: { telephone, villeId: ville?.id ?? null, desinscritLe: null } });
  if (!deja) {
    await db.smsAlertSubscription.create({ data: { telephone, villeId: ville?.id ?? null, consentementLe: new Date(), texteConsentement: t('alertes.consentement') } });
  }
  return { ok: true, message: t('alertes.succes') };
}

export async function seDesabonnerAlertes(_e: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  const t = await getTranslations();
  if (estRobot(formData)) return { ok: true, message: t('alertes.desinscrit') };
  const telephone = normaliserTelephone(String(formData.get('telephone') ?? ''));
  if (!telephone) return { ok: false, erreurs: { telephone: t('telephone.invalide') } };
  try {
    await exigerLimites([{ cle: `desabo:ip:${await ipClient()}`, max: 10, fenetre: 3600 }]);
  } catch (e) {
    if (e instanceof TropDeDemandes) return { ok: false, message: t('commun.tropDeDemandes') };
    throw e;
  }
  await db.smsAlertSubscription.updateMany({ where: { telephone, desinscritLe: null }, data: { desinscritLe: new Date() } });
  return { ok: true, message: t('alertes.desinscrit') };
}

export async function rejoindreListeAttente(_e: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  const t = await getTranslations();
  if (estRobot(formData)) return { ok: true, message: t('evenement.listeAttenteOk') };
  const telephone = normaliserTelephone(String(formData.get('telephone') ?? ''));
  const evenementId = String(formData.get('evenementId') ?? '');
  const erreurs: Record<string, string> = {};
  if (!telephone) erreurs.telephone = t('telephone.invalide');
  if (formData.get('consentement') !== 'oui') erreurs.consentement = t('alertes.consentementRequis');
  if (!telephone || Object.keys(erreurs).length) return { ok: false, erreurs };
  try {
    await exigerLimites([{ cle: `attente:ip:${await ipClient()}`, max: 10, fenetre: 3600 }]);
  } catch (e) {
    if (e instanceof TropDeDemandes) return { ok: false, message: t('commun.tropDeDemandes') };
    throw e;
  }
  const evt = await db.event.findFirst({ where: { id: evenementId, statut: { in: ['PUBLIE', 'COMPLET'] } }, select: { id: true } });
  if (!evt) return { ok: false, message: t('commun.erreurInconnue') };
  await db.waitlistEntry.upsert({ where: { evenementId_telephone: { evenementId: evt.id, telephone } }, update: {}, create: { evenementId: evt.id, telephone, consentementLe: new Date() } });
  return { ok: true, message: t('evenement.listeAttenteOk') };
}
