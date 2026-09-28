'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auditer } from '@/lib/audit';
import { ROLES_EDITION } from '@/lib/auth/roles';
import { exigerRole } from '@/lib/auth/session';
import { db, Prisma } from '@/lib/db';
import { localVersUtc } from '@/lib/fuseaux';

export interface EtatAction { ok: boolean; message?: string; erreurs?: Record<string, string> }

export async function creerPromo(_e: EtatAction, formData: FormData): Promise<EtatAction> {
  const s = await exigerRole(ROLES_EDITION);
  const r = z.object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,30}$/, '3 à 30 lettres, chiffres ou tirets'),
    // Montant fixe : dans une devise précise. Pourcentage : s'applique aux paiements en CDF comme en USD.
    type: z.enum(['POURCENTAGE', 'MONTANT_CDF', 'MONTANT_USD']),
    valeur: z.coerce.number().positive('Valeur requise'),
    evenementId: z.string().optional(),
    quota: z.string().optional().transform((v) => (v ? Number(v) : null)).refine((v) => v === null || (Number.isInteger(v) && v > 0), 'Entier positif'),
    debut: z.string().optional(), fin: z.string().optional(),
    limiteParTelephone: z.coerce.number().int().min(1).max(20).default(1),
  }).safeParse(Object.fromEntries(formData));
  if (!r.success) return { ok: false, erreurs: Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])) };
  const d = r.data;
  if (d.type === 'POURCENTAGE' && d.valeur > 100) return { ok: false, erreurs: { valeur: '100 % maximum' } };
  const type = d.type === 'POURCENTAGE' ? 'POURCENTAGE' as const : 'MONTANT' as const;
  const devise = d.type === 'MONTANT_CDF' ? 'CDF' as const : d.type === 'MONTANT_USD' ? 'USD' as const : null;
  // Pourcentage en points de base, CDF en francs entiers, USD en centimes.
  const valeur = d.type === 'POURCENTAGE' ? Math.round(d.valeur * 100) : d.type === 'MONTANT_USD' ? Math.round(d.valeur * 100) : Math.round(d.valeur);
  const jour = (v?: string, h = '00:00') => (v ? localVersUtc(v, h, 'Africa/Kinshasa') : null);
  try {
    const p = await db.promoCode.create({ data: { code: d.code, type, devise, valeur, evenementId: d.evenementId || null, quota: d.quota, debutLe: jour(d.debut), finLe: jour(d.fin, '23:59'), limiteParTelephone: d.limiteParTelephone } });
    await auditer({ acteur: s.user, action: 'promo.creer', entite: 'PromoCode', entiteId: p.id, apres: { code: p.code, type: p.type, valeur: p.valeur, devise: p.devise } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return { ok: false, erreurs: { code: 'Ce code existe déjà' } };
    throw e;
  }
  revalidatePath('/admin/promos');
  return { ok: true, message: 'Code créé.' };
}

export async function basculerPromo(id: string, actif: boolean) {
  const s = await exigerRole(ROLES_EDITION);
  await db.promoCode.update({ where: { id }, data: { actif } });
  await auditer({ acteur: s.user, action: actif ? 'promo.activer' : 'promo.desactiver', entite: 'PromoCode', entiteId: id });
  revalidatePath('/admin/promos');
}
