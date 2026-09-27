'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auditer } from '@/lib/audit';
import { ROLES_EDITION } from '@/lib/auth/roles';
import { exigerRole } from '@/lib/auth/session';
import { db } from '@/lib/db';

export interface EtatAction { ok: boolean; message?: string; erreurs?: Record<string, string> }

export async function enregistrerReversement(evenementId: string, _e: EtatAction, formData: FormData): Promise<EtatAction> {
  const s = await exigerRole(ROLES_EDITION);
  const r = z.object({
    montant: z.coerce.number().int('Montant entier en CDF').min(1, 'Montant requis'),
    operateur: z.enum(['', 'MPESA', 'AIRTEL', 'ORANGE', 'AFRIMONEY']).optional(),
    reference: z.string().trim().min(3, 'Référence de transaction requise').max(80),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date requise'),
    note: z.string().trim().max(300).optional(),
  }).safeParse(Object.fromEntries(formData));
  if (!r.success) return { ok: false, erreurs: Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])) };
  const e = await db.event.findUniqueOrThrow({ where: { id: evenementId }, select: { organisateurId: true } });
  if (!e.organisateurId) return { ok: false, message: 'Événement sans organisateur.' };
  const p = await db.payout.create({ data: { organisateurId: e.organisateurId, evenementId, montantCdf: r.data.montant, operateur: r.data.operateur || null, referenceTransaction: r.data.reference, effectueLe: new Date(`${r.data.date}T12:00:00Z`), saisiParId: s.user.id, note: r.data.note || null } });
  await auditer({ acteur: s.user, action: 'reversement.enregistrer', entite: 'Payout', entiteId: p.id, apres: { evenementId, montantCdf: p.montantCdf, reference: p.referenceTransaction } });
  revalidatePath('/admin/reversements');
  return { ok: true, message: 'Reversement enregistré.' };
}
