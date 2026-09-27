'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auditer } from '@/lib/audit';
import { hacherMotDePasse, motDePasseFort } from '@/lib/auth/motdepasse';
import { ROLES_EDITION } from '@/lib/auth/roles';
import { exigerRole } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { normaliserTelephone } from '@/lib/telephone';

export interface EtatAction { ok: boolean; message?: string; erreurs?: Record<string, string> }

export async function creerControleur(_e: EtatAction, formData: FormData): Promise<EtatAction> {
  const s = await exigerRole(ROLES_EDITION);
  const r = z.object({ nom: z.string().trim().min(2, 'Nom requis').max(80), telephone: z.string(), motDePasse: z.string(), evenementId: z.string().min(1, 'Choisissez un événement'), porte: z.string().trim().max(40).optional() }).safeParse(Object.fromEntries(formData));
  if (!r.success) return { ok: false, erreurs: Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])) };
  const telephone = normaliserTelephone(r.data.telephone);
  if (!telephone) return { ok: false, erreurs: { telephone: 'Numéro invalide' } };
  const existant = await db.user.findUnique({ where: { telephone } });
  if (!existant && !motDePasseFort(r.data.motDePasse)) return { ok: false, erreurs: { motDePasse: '12 caractères minimum, avec lettres et chiffres' } };
  if (existant && r.data.motDePasse && !motDePasseFort(r.data.motDePasse)) return { ok: false, erreurs: { motDePasse: '12 caractères minimum, avec lettres et chiffres' } };
  const roles = Array.from(new Set([...(existant?.roles ?? []), 'CONTROLEUR' as const]));
  const user = await db.user.upsert({
    where: { telephone },
    update: { roles, nom: existant?.nom ?? r.data.nom, ...(r.data.motDePasse ? { motDePasse: await hacherMotDePasse(r.data.motDePasse) } : {}) },
    create: { telephone, nom: r.data.nom, roles, motDePasse: await hacherMotDePasse(r.data.motDePasse) },
  });
  await db.eventController.upsert({ where: { userId_evenementId: { userId: user.id, evenementId: r.data.evenementId } }, update: { porte: r.data.porte || null }, create: { userId: user.id, evenementId: r.data.evenementId, porte: r.data.porte || null } });
  await auditer({ acteur: s.user, action: 'controleur.affecter', entite: 'User', entiteId: user.id, apres: { evenementId: r.data.evenementId, porte: r.data.porte } });
  revalidatePath('/admin/controleurs');
  return { ok: true, message: 'Contrôleur affecté. Il se connecte sur /admin/connexion (mot de passe et code SMS), puis ouvre le scanner.' };
}

export async function retirerControleur(userId: string, evenementId: string) {
  const s = await exigerRole(ROLES_EDITION);
  await db.eventController.delete({ where: { userId_evenementId: { userId, evenementId } } });
  await auditer({ acteur: s.user, action: 'controleur.retirer', entite: 'User', entiteId: userId, apres: { evenementId } });
  revalidatePath('/admin/controleurs');
}
