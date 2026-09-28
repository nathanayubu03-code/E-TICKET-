'use server';

import { revalidatePath } from 'next/cache';
import { annulerCommande, marquerRemboursee, renvoyerSmsBillets } from '@/lib/admin/commandes';
import { ROLES_EDITION } from '@/lib/auth/roles';
import { exigerRole } from '@/lib/auth/session';

export async function renvoyer(id: string) {
  const s = await exigerRole(['SUPERADMIN', 'ADMIN', 'AGENT']);
  return { ok: true, message: await renvoyerSmsBillets(id, s.user) };
}
export async function annuler(id: string) {
  const s = await exigerRole(ROLES_EDITION);
  const message = await annulerCommande(id, s.user);
  revalidatePath('/admin/commandes');
  return { ok: true, message };
}
export async function rembourser(id: string) {
  const s = await exigerRole(ROLES_EDITION);
  const message = await marquerRemboursee(id, s.user, 'Remboursement manuel Mobile Money');
  revalidatePath('/admin/commandes');
  return { ok: true, message };
}
