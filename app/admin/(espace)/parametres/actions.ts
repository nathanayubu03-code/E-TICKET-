'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auditer } from '@/lib/audit';
import { exigerRole } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { OPERATEURS } from '@/lib/operateurs';
import { BORNES_COMMISSION_BPS } from '@/lib/referentiel';
import { normaliserTelephone } from '@/lib/telephone';

export interface EtatAction { ok: boolean; message?: string; erreurs?: Record<string, string>; sauveLe?: string }

// Paramètres globaux : réservés au super-administrateur.
export async function enregistrerParametres(_e: EtatAction, formData: FormData): Promise<EtatAction> {
  const s = await exigerRole(['SUPERADMIN']);
  const r = z.object({ commission: z.string(), limite: z.coerce.number().int().min(1, 'Entre 1 et 20').max(20, 'Entre 1 et 20') }).safeParse(Object.fromEntries(formData));
  if (!r.success) return { ok: false, erreurs: Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])) };
  const bps = Math.round(Number(r.data.commission.replace(',', '.')) * 100);
  if (!Number.isFinite(bps) || bps < BORNES_COMMISSION_BPS.min || bps > BORNES_COMMISSION_BPS.max) return { ok: false, erreurs: { commission: 'Entre 0 et 30 %' } };
  // Numéros marchands : un par opérateur et par devise (ils peuvent différer).
  const numeros: Record<string, string> = {};
  const numerosUsd: Record<string, string> = {};
  for (const o of OPERATEURS) {
    for (const [champ, cible] of [[`numero_${o.k}`, numeros], [`numero_usd_${o.k}`, numerosUsd]] as const) {
      const v = String(formData.get(champ) ?? '').trim();
      if (!v) continue;
      const n = normaliserTelephone(v);
      if (!n) return { ok: false, erreurs: { [champ]: 'Numéro invalide' } };
      cible[o.k] = n;
    }
  }
  const avant = await db.setting.findMany();
  for (const [cle, valeur] of [['commission_bps', bps], ['limite_billets', r.data.limite], ['numeros_marchands', numeros], ['numeros_marchands_usd', numerosUsd]] as const) {
    await db.setting.upsert({ where: { cle }, update: { valeur, majParId: s.user.id }, create: { cle, valeur, majParId: s.user.id } });
  }
  await auditer({ acteur: s.user, action: 'parametres.modifier', entite: 'Setting', avant: Object.fromEntries(avant.map((a) => [a.cle, a.valeur])), apres: { commission_bps: bps, limite_billets: r.data.limite, numeros_marchands: numeros } });
  revalidatePath('/', 'layout');
  return { ok: true, sauveLe: new Date().toISOString() };
}

