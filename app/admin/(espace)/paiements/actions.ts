'use server';

import { revalidatePath } from 'next/cache';
import { exigerRole } from '@/lib/auth/session';
import { refuserReclamation, validerReclamation } from '@/lib/paiement/manuel';

const ROLES = ['SUPERADMIN', 'ADMIN', 'AGENT'] as const;

export async function valider(id: string) {
  const s = await exigerRole([...ROLES]);
  const issue = await validerReclamation(id, s.user);
  revalidatePath('/admin/paiements/manuels');
  const messages: Record<string, string> = { payee: 'Validé : billets générés et SMS envoyé.', payee_sans_place: 'Validé, mais plus de place : commande à rembourser.', deja_traite: 'Déjà traité.', double_paiement: 'Commande déjà payée : ce paiement est à rembourser.', ignore: 'Commande dans un état qui ne permet pas la validation.' };
  return { ok: issue === 'payee', message: messages[issue] ?? issue };
}

export async function refuser(id: string, motif: string) {
  const s = await exigerRole([...ROLES]);
  const ok = await refuserReclamation(id, s.user, motif || 'Référence introuvable chez l’opérateur');
  revalidatePath('/admin/paiements/manuels');
  return { ok, message: ok ? 'Refusé : SMS envoyé à l’acheteur.' : 'Déjà traité.' };
}
