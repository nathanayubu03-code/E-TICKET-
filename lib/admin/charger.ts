import { notFound } from 'next/navigation';
import { ROLES_EDITION } from '@/lib/auth/roles';
import { exigerRole } from '@/lib/auth/session';
import { db } from '@/lib/db';

/** Événement pour une étape d'édition (réservé aux rôles d'édition). */
export async function evenementAEditer(id: string) {
  await exigerRole(ROLES_EDITION);
  const e = await db.event.findUnique({ where: { id }, include: { typesBillet: { orderBy: { ordre: 'asc' } }, programme: { orderBy: [{ ordre: 'asc' }, { heure: 'asc' }] }, ville: true, lieu: true, categorie: true } });
  if (!e) notFound();
  return e;
}
