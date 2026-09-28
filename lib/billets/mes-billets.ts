import { db } from '@/lib/db';
import type { SessionCourante } from '@/lib/auth/session';
import { billetsHorsLigne } from './hors-ligne';

const MARGE_MS = 6 * 3600_000;

/** Billets payés de l'acheteur : à venir (prêts pour le hors ligne) et passés. */
export async function billetsDeLAcheteur(s: SessionCourante, maintenant = new Date(), langue?: string) {
  const billets = await db.ticket.findMany({
    where: { statut: { not: 'ANNULE' }, commande: { statut: 'PAYEE', OR: [{ userId: s.user.id }, { telephone: s.user.telephone }] } },
    include: { evenement: { select: { titre: true, titreEn: true, debutLe: true, fuseau: true } } },
    orderBy: { emisLe: 'desc' },
    take: 100,
  });
  const limite = maintenant.getTime() - MARGE_MS;
  const aVenir = billets.filter((b) => b.statut === 'VALIDE' && (!b.evenement.debutLe || b.evenement.debutLe.getTime() > limite));
  const passes = billets.filter((b) => !aVenir.includes(b));
  return { aVenir: await billetsHorsLigne(aVenir.map((b) => b.id), langue), passes };
}
