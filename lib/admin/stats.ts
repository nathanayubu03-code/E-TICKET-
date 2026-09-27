import { db, type Prisma } from '@/lib/db';
import { infoOperateur } from '@/lib/operateurs';

// Chiffres du tableau de bord : uniquement des sommes sur la base, aucune valeur fictive.
export interface Totaux { commandes: number; billets: number; brut: number; commission: number; net: number }

export async function totaux(where: Prisma.OrderWhereInput): Promise<Totaux> {
  const [agg, billets] = await Promise.all([
    db.order.aggregate({ where: { ...where, statut: 'PAYEE' }, _count: true, _sum: { totalCdf: true, commissionCdf: true, netOrganisateurCdf: true } }),
    db.orderItem.aggregate({ where: { commande: { ...where, statut: 'PAYEE' } }, _sum: { quantite: true } }),
  ]);
  return { commandes: agg._count, billets: billets._sum.quantite ?? 0, brut: agg._sum.totalCdf ?? 0, commission: agg._sum.commissionCdf ?? 0, net: agg._sum.netOrganisateurCdf ?? 0 };
}

/** Montants encaissés par opérateur (paiements réussis et paiements chez un agent validés). */
export async function parOperateur(where: Prisma.OrderWhereInput): Promise<{ nom: string; fond: string; montant: number }[]> {
  const [mm, manuels] = await Promise.all([
    db.payment.groupBy({ by: ['operateur'], where: { statut: 'REUSSI', commande: { ...where, statut: 'PAYEE' } }, _sum: { montantCdf: true } }),
    db.manualPaymentClaim.groupBy({ by: ['operateur'], where: { statut: 'VALIDEE', commande: { ...where, statut: 'PAYEE' } }, _sum: { montantCdf: true } }),
  ]);
  const total = new Map<string, number>();
  for (const l of [...mm, ...manuels]) total.set(l.operateur, (total.get(l.operateur) ?? 0) + (l._sum.montantCdf ?? 0));
  return [...total].map(([k, montant]) => { const o = infoOperateur(k as never); return { nom: o.nom, fond: o.fond, montant }; }).sort((a, b) => b.montant - a.montant);
}

/** Billets vendus par catégorie de billet. */
export async function parCategorie(where: Prisma.OrderWhereInput): Promise<{ nom: string; billets: number; montant: number }[]> {
  const lignes = await db.orderItem.findMany({ where: { commande: { ...where, statut: 'PAYEE' } }, select: { quantite: true, prixUnitaireCdf: true, typeBillet: { select: { nom: true, evenement: { select: { titre: true } } } } } });
  const m = new Map<string, { nom: string; billets: number; montant: number }>();
  for (const l of lignes) {
    const cle = `${l.typeBillet.evenement.titre} · ${l.typeBillet.nom}`;
    const v = m.get(cle) ?? { nom: cle, billets: 0, montant: 0 };
    v.billets += l.quantite;
    v.montant += l.quantite * l.prixUnitaireCdf;
    m.set(cle, v);
  }
  return [...m.values()].sort((a, b) => b.billets - a.billets);
}

/** Montant dû à l'organisateur par événement : net des commandes payées moins les reversements enregistrés. */
export async function reversementsDus(organisateurId?: string | null) {
  const evts = await db.event.findMany({
    where: { organisateurId: organisateurId ?? { not: null }, commandes: { some: { statut: 'PAYEE' } } },
    select: { id: true, titre: true, debutLe: true, fuseau: true, organisateur: { select: { id: true, nom: true, reversementOperateur: true, reversementNumeroFin: true } } },
    orderBy: { debutLe: 'desc' },
  });
  return Promise.all(evts.map(async (e) => {
    const [net, verse] = await Promise.all([
      db.order.aggregate({ where: { evenementId: e.id, statut: 'PAYEE' }, _sum: { netOrganisateurCdf: true, totalCdf: true, commissionCdf: true } }),
      db.payout.aggregate({ where: { evenementId: e.id }, _sum: { montantCdf: true } }),
    ]);
    const du = net._sum.netOrganisateurCdf ?? 0;
    const deja = verse._sum.montantCdf ?? 0;
    return { ...e, brut: net._sum.totalCdf ?? 0, commission: net._sum.commissionCdf ?? 0, net: du, verse: deja, reste: du - deja };
  }));
}
