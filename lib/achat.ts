import { db } from './db';
import type { SessionCourante } from './auth/session';

/** Commande visible par son acheteur (compte connecté ou même numéro). */
export async function commandeDeLAcheteur(code: string, s: SessionCourante | null) {
  if (!s) return null;
  const c = await db.order.findUnique({
    where: { code },
    include: {
      evenement: { include: { ville: true, lieu: true } },
      lignes: { include: { typeBillet: { select: { nom: true } } } },
      paiements: { orderBy: { creeLe: 'desc' }, take: 1 },
      reclamations: { orderBy: { creeLe: 'desc' }, take: 1 },
      billets: { include: { typeBillet: { select: { nom: true } } }, orderBy: { emisLe: 'asc' } },
    },
  });
  if (!c || (c.userId !== s.user.id && c.telephone !== s.user.telephone)) return null;
  return c;
}
