import { DEVISES, type Devise } from '@/lib/argent';
import { db, type Prisma } from '@/lib/db';
import { infoOperateur } from '@/lib/operateurs';

// Chiffres du tableau de bord : uniquement des sommes sur la base, aucune valeur fictive.
// Les montants restent séparés par devise : CDF et USD ne sont jamais additionnés.

export interface MontantsDevise { brut: number; commission: number; net: number }
export type ParDevise<T> = Record<Devise, T>;
const zero = (): MontantsDevise => ({ brut: 0, commission: 0, net: 0 });

export interface Totaux { commandes: number; billets: number; parDevise: ParDevise<MontantsDevise> }

export async function totaux(where: Prisma.OrderWhereInput): Promise<Totaux> {
  const [groupes, billets] = await Promise.all([
    db.order.groupBy({ by: ['devise'], where: { ...where, statut: 'PAYEE' }, _count: true, _sum: { total: true, montantCommission: true, netOrganisateur: true } }),
    db.orderItem.aggregate({ where: { commande: { ...where, statut: 'PAYEE' } }, _sum: { quantite: true } }),
  ]);
  const parDevise: ParDevise<MontantsDevise> = { CDF: zero(), USD: zero() };
  let commandes = 0;
  for (const g of groupes) {
    commandes += g._count;
    parDevise[g.devise] = { brut: g._sum.total ?? 0, commission: g._sum.montantCommission ?? 0, net: g._sum.netOrganisateur ?? 0 };
  }
  return { commandes, billets: billets._sum.quantite ?? 0, parDevise };
}

/** Montants encaissés par opérateur et par devise (paiements réussis et paiements chez un agent validés). */
export async function parOperateur(where: Prisma.OrderWhereInput): Promise<{ nom: string; fond: string; devise: Devise; montant: number }[]> {
  const [mm, manuels] = await Promise.all([
    db.payment.groupBy({ by: ['operateur', 'devise'], where: { statut: 'REUSSI', commande: { ...where, statut: 'PAYEE' } }, _sum: { montant: true } }),
    db.manualPaymentClaim.groupBy({ by: ['operateur', 'devise'], where: { statut: 'VALIDEE', commande: { ...where, statut: 'PAYEE' } }, _sum: { montant: true } }),
  ]);
  const total = new Map<string, { operateur: string; devise: Devise; montant: number }>();
  for (const l of [...mm, ...manuels]) {
    const cle = `${l.operateur}:${l.devise}`;
    const v = total.get(cle) ?? { operateur: l.operateur, devise: l.devise, montant: 0 };
    v.montant += l._sum.montant ?? 0;
    total.set(cle, v);
  }
  return [...total.values()]
    .map((v) => { const o = infoOperateur(v.operateur as never); return { nom: o.nom, fond: o.fond, devise: v.devise, montant: v.montant }; })
    .sort((a, b) => a.devise.localeCompare(b.devise) || b.montant - a.montant);
}

/** Billets vendus par catégorie de billet, avec le montant encaissé dans chaque devise. */
export async function parCategorie(where: Prisma.OrderWhereInput): Promise<{ nom: string; billets: number; montants: ParDevise<number> }[]> {
  const lignes = await db.orderItem.findMany({ where: { commande: { ...where, statut: 'PAYEE' } }, select: { quantite: true, prixUnitaire: true, commande: { select: { devise: true } }, typeBillet: { select: { nom: true, evenement: { select: { titre: true } } } } } });
  const m = new Map<string, { nom: string; billets: number; montants: ParDevise<number> }>();
  for (const l of lignes) {
    const cle = `${l.typeBillet.evenement.titre} · ${l.typeBillet.nom}`;
    const v = m.get(cle) ?? { nom: cle, billets: 0, montants: { CDF: 0, USD: 0 } };
    v.billets += l.quantite;
    v.montants[l.commande.devise] += l.quantite * l.prixUnitaire;
    m.set(cle, v);
  }
  return [...m.values()].sort((a, b) => b.billets - a.billets);
}

export interface SoldeDevise extends MontantsDevise { verse: number; reste: number }

/**
 * Montant dû à l'organisateur par événement et par devise : net des commandes payées dans cette devise
 * moins les reversements enregistrés dans la même devise.
 */
export async function reversementsDus(organisateurId?: string | null) {
  const evts = await db.event.findMany({
    where: { organisateurId: organisateurId ?? { not: null }, commandes: { some: { statut: 'PAYEE' } } },
    select: { id: true, titre: true, debutLe: true, fuseau: true, organisateur: { select: { id: true, nom: true, reversementOperateur: true, reversementNumeroFin: true } } },
    orderBy: { debutLe: 'desc' },
  });
  return Promise.all(evts.map(async (e) => {
    const [ventes, verses] = await Promise.all([
      db.order.groupBy({ by: ['devise'], where: { evenementId: e.id, statut: 'PAYEE' }, _sum: { netOrganisateur: true, total: true, montantCommission: true } }),
      db.payout.groupBy({ by: ['devise'], where: { evenementId: e.id }, _sum: { montant: true } }),
    ]);
    const soldes = Object.fromEntries(DEVISES.map((d) => {
      const v = ventes.find((x) => x.devise === d);
      const net = v?._sum.netOrganisateur ?? 0;
      const verse = verses.find((x) => x.devise === d)?._sum.montant ?? 0;
      return [d, { brut: v?._sum.total ?? 0, commission: v?._sum.montantCommission ?? 0, net, verse, reste: net - verse }];
    })) as ParDevise<SoldeDevise>;
    // Une devise sans vente ni reversement n'est pas affichée.
    const devises = DEVISES.filter((d) => soldes[d].brut > 0 || soldes[d].verse > 0);
    return { ...e, soldes, devises };
  }));
}
