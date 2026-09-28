'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auditer } from '@/lib/audit';
import { hacherMotDePasse, motDePasseFort, verifierMotDePasse } from '@/lib/auth/motdepasse';
import { ROLES_ADMIN } from '@/lib/auth/roles';
import { exigerRole } from '@/lib/auth/session';
import { db } from '@/lib/db';

export interface EtatAction { ok: boolean; message?: string; erreurs?: Record<string, string>; sauveLe?: string }

/** Nom affiché dans l'administration (la connexion se fait toujours par le numéro de téléphone). */
export async function changerNom(_e: EtatAction, formData: FormData): Promise<EtatAction> {
  const s = await exigerRole(ROLES_ADMIN);
  const r = z.object({ nom: z.string().trim().min(2, '2 caractères minimum').max(80, '80 caractères maximum') }).safeParse(Object.fromEntries(formData));
  if (!r.success) return { ok: false, erreurs: { nom: r.error.issues[0]!.message } };
  await db.user.update({ where: { id: s.user.id }, data: { nom: r.data.nom } });
  await auditer({ acteur: s.user, action: 'compte.nom', entite: 'User', entiteId: s.user.id, avant: { nom: s.user.nom }, apres: { nom: r.data.nom } });
  revalidatePath('/admin', 'layout');
  return { ok: true, message: 'Nom enregistré.' };
}

/** Change le mot de passe (ancien exigé) et ferme les autres sessions de ce compte. */
export async function changerMotDePasse(_e: EtatAction, formData: FormData): Promise<EtatAction> {
  const s = await exigerRole(ROLES_ADMIN);
  const actuel = String(formData.get('actuel') ?? '');
  const nouveau = String(formData.get('nouveau') ?? '');
  const confirmation = String(formData.get('confirmation') ?? '');
  const user = await db.user.findUniqueOrThrow({ where: { id: s.user.id }, select: { motDePasse: true } });
  if (!user.motDePasse || !(await verifierMotDePasse(user.motDePasse, actuel))) return { ok: false, erreurs: { actuel: 'Mot de passe actuel incorrect.' } };
  if (!motDePasseFort(nouveau)) return { ok: false, erreurs: { nouveau: '12 caractères minimum, avec au moins une lettre et un chiffre.' } };
  if (nouveau !== confirmation) return { ok: false, erreurs: { confirmation: 'Les deux mots de passe ne sont pas identiques.' } };
  await db.user.update({ where: { id: s.user.id }, data: { motDePasse: await hacherMotDePasse(nouveau) } });
  await db.session.deleteMany({ where: { userId: s.user.id, NOT: { id: s.id } } });
  await auditer({ acteur: s.user, action: 'compte.mot_de_passe', entite: 'User', entiteId: s.user.id });
  return { ok: true, message: 'Mot de passe changé. Les autres appareils connectés à ce compte ont été déconnectés.' };
}
