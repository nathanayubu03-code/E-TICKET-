import { commission, type Devise } from './argent';
import { codeCommande, genererBillets } from './billets/generation';
import { db, type Prisma } from './db';
import { langueSure } from './langue';
import { parametre } from './parametres';

export const RESERVATION_MS = 10 * 60_000;
export const RESERVATION_MANUELLE_MS = 2 * 3600_000;

export type ErreurCommande =
  | { code: 'evenement_indisponible' }
  | { code: 'ligne_invalide' }
  | { code: 'vente_fermee' }
  | { code: 'plus_assez'; typeId: string }
  | { code: 'limite_personne'; max: number }
  | { code: 'limite_commande'; typeId: string; max: number }
  | { code: 'promo_invalide' }
  | { code: 'devise_indisponible' };

export class CommandeRefusee extends Error {
  constructor(public erreur: ErreurCommande) { super(erreur.code); }
}

export interface Ligne { typeId: string; quantite: number }

/** « id:qte,id:qte » → lignes regroupées, quantités positives uniquement. */
export function lireLignes(brut: string): Ligne[] {
  const total = new Map<string, number>();
  for (const morceau of brut.split(',')) {
    const [id, q] = morceau.split(':');
    const n = Number(q);
    if (!id || !/^[a-z0-9]{10,40}$/.test(id) || !Number.isInteger(n) || n <= 0 || n > 50) continue;
    total.set(id, (total.get(id) ?? 0) + n);
  }
  return [...total].map(([typeId, quantite]) => ({ typeId, quantite }));
}

async function remisePromo(tx: Prisma.TransactionClient, code: string, evenementId: string, telephone: string, sousTotal: number) {
  const promo = await tx.promoCode.findUnique({ where: { code: code.trim().toUpperCase() } });
  const maintenant = new Date();
  if (!promo || !promo.actif || (promo.evenementId && promo.evenementId !== evenementId) || (promo.debutLe && promo.debutLe > maintenant) || (promo.finLe && promo.finLe < maintenant)) throw new CommandeRefusee({ code: 'promo_invalide' });
  const parTel = await tx.promoRedemption.count({ where: { promoId: promo.id, telephone, commande: { statut: { in: ['PAYEE', 'EN_ATTENTE'] } } } });
  if (parTel >= promo.limiteParTelephone) throw new CommandeRefusee({ code: 'promo_invalide' });
  // Quota : incrément conditionnel, atomique.
  if (promo.quota !== null) {
    const pris = await tx.promoCode.updateMany({ where: { id: promo.id, utilise: { lt: promo.quota } }, data: { utilise: { increment: 1 } } });
    if (pris.count === 0) throw new CommandeRefusee({ code: 'promo_invalide' });
  } else {
    await tx.promoCode.update({ where: { id: promo.id }, data: { utilise: { increment: 1 } } });
  }
  return { promo, remise: remiseDansDevise(promo, sousTotal, 'CDF') };
}

/**
 * Remise d'un code promo dans une devise. Un pourcentage s'applique aux deux devises ; un montant fixe
 * seulement dans sa propre devise (un code de 1 000 CDF ne donne rien sur un paiement en USD).
 */
export function remiseDansDevise(promo: { type: 'POURCENTAGE' | 'MONTANT'; valeur: number; devise: Devise | null }, sousTotal: number, devise: Devise): number {
  if (promo.type === 'POURCENTAGE') return Math.floor((sousTotal * promo.valeur) / 10000);
  return (promo.devise ?? 'CDF') === devise ? Math.min(promo.valeur, sousTotal) : 0;
}

export interface MontantsCommande { devise: Devise; sousTotal: number; remise: number; total: number; montantCommission: number; netOrganisateur: number; prixUnitaires: Map<string, number> }

/**
 * Montants d'une commande dans une devise, à partir des prix saisis pour chaque catégorie.
 * null si une catégorie du panier n'a pas de prix dans cette devise : pas de conversion.
 */
export function montantsDansDevise(
  c: { commissionBps: number; lignes: { id: string; quantite: number; typeBillet: { prixCdf: number; prixUsd: number | null } }[]; promo: { promo: { type: 'POURCENTAGE' | 'MONTANT'; valeur: number; devise: Devise | null } } | null },
  devise: Devise,
): MontantsCommande | null {
  const prixUnitaires = new Map<string, number>();
  let sousTotal = 0;
  for (const l of c.lignes) {
    const prix = devise === 'CDF' ? l.typeBillet.prixCdf : l.typeBillet.prixUsd;
    if (prix === null || prix === undefined) return null;
    prixUnitaires.set(l.id, prix);
    sousTotal += prix * l.quantite;
  }
  const remise = c.promo ? remiseDansDevise(c.promo.promo, sousTotal, devise) : 0;
  const total = sousTotal - remise;
  const com = commission(total, c.commissionBps);
  return { devise, sousTotal, remise, total, montantCommission: com, netOrganisateur: total - com, prixUnitaires };
}

const inclusionMontants = { lignes: { include: { typeBillet: { select: { prixCdf: true, prixUsd: true } } } }, promo: { include: { promo: { select: { type: true, valeur: true, devise: true } } } } } as const;

/** Les montants de la commande dans chaque devise possible (USD absent si une catégorie n'a pas de prix USD). */
export async function montantsPossibles(commandeId: string): Promise<{ CDF: MontantsCommande; USD: MontantsCommande | null } | null> {
  const c = await db.order.findUnique({ where: { id: commandeId }, include: inclusionMontants });
  if (!c) return null;
  return { CDF: montantsDansDevise(c, 'CDF')!, USD: montantsDansDevise(c, 'USD') };
}

/**
 * Passe une commande en attente dans une autre devise, juste avant le paiement : recalcule les prix
 * unitaires, la remise, le total et la commission. Refusé si une catégorie n'a pas de prix dans cette
 * devise, ou si un paiement est déjà en cours (le montant demandé à l'opérateur ne doit pas changer).
 */
export async function choisirDevise(commandeId: string, devise: Devise): Promise<{ ok: true } | { ok: false; raison: 'devise_indisponible' | 'paiement_en_cours' | 'commande_indisponible' }> {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`devise:${commandeId}`}))`;
    const c = await tx.order.findUnique({ where: { id: commandeId }, include: { ...inclusionMontants, paiements: { where: { statut: { in: ['INITIE', 'EN_ATTENTE'] } }, select: { id: true } }, reclamations: { where: { statut: 'EN_ATTENTE' }, select: { id: true } } } });
    if (!c || c.statut !== 'EN_ATTENTE') return { ok: false as const, raison: 'commande_indisponible' as const };
    if (c.devise === devise) return { ok: true as const };
    if (c.paiements.length || c.reclamations.length) return { ok: false as const, raison: 'paiement_en_cours' as const };
    const m = montantsDansDevise(c, devise);
    if (!m) return { ok: false as const, raison: 'devise_indisponible' as const };
    for (const l of c.lignes) await tx.orderItem.update({ where: { id: l.id }, data: { prixUnitaire: m.prixUnitaires.get(l.id)! } });
    if (c.promo) await tx.promoRedemption.update({ where: { commandeId }, data: { remise: m.remise } });
    await tx.order.update({ where: { id: commandeId }, data: { devise, sousTotal: m.sousTotal, remise: m.remise, total: m.total, montantCommission: m.montantCommission, netOrganisateur: m.netOrganisateur } });
    return { ok: true as const };
  });
}

/**
 * Crée une commande EN_ATTENTE et réserve les places dans une seule transaction.
 * Chaque stock est décrémenté par une mise à jour conditionnelle (restant >= quantité),
 * jamais par lecture puis écriture. Les commandes d'un même numéro pour un même événement
 * sont sérialisées par un verrou consultatif, pour que la limite par personne tienne.
 */
export async function creerCommande(p: { telephone: string; userId: string | null; evenementId: string; lignes: Ligne[]; codePromo?: string | null; langue?: string }) {
  if (p.lignes.length === 0) throw new CommandeRefusee({ code: 'ligne_invalide' });
  const maintenant = new Date();
  const [limiteGlobale, commissionGlobale] = await Promise.all([parametre('limite_billets'), parametre('commission_bps')]);

  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`commande:${p.telephone}:${p.evenementId}`}))`;
    const e = await tx.event.findUnique({ where: { id: p.evenementId }, include: { typesBillet: true, organisateur: { select: { commissionBps: true } } } });
    if (!e || e.statut !== 'PUBLIE' || e.archiveLe || !e.debutLe || e.debutLe < maintenant) throw new CommandeRefusee({ code: 'evenement_indisponible' });
    const limite = e.limiteParPersonne ?? limiteGlobale;
    const demande = p.lignes.reduce((s, l) => s + l.quantite, 0);

    const deja = await tx.orderItem.aggregate({
      _sum: { quantite: true },
      where: { commande: { telephone: p.telephone, evenementId: e.id, OR: [{ statut: 'PAYEE' }, { statut: 'EN_ATTENTE', reserveJusquau: { gt: maintenant } }] } },
    });
    if ((deja._sum.quantite ?? 0) + demande > limite) throw new CommandeRefusee({ code: 'limite_personne', max: limite });

    let sousTotal = 0;
    const lignes: Prisma.OrderItemCreateWithoutCommandeInput[] = [];
    for (const l of p.lignes) {
      const t = e.typesBillet.find((x) => x.id === l.typeId);
      if (!t) throw new CommandeRefusee({ code: 'ligne_invalide' });
      if ((t.venteDebutLe && t.venteDebutLe > maintenant) || (t.venteFinLe && t.venteFinLe < maintenant)) throw new CommandeRefusee({ code: 'vente_fermee' });
      if (t.limiteParCommande && l.quantite > t.limiteParCommande) throw new CommandeRefusee({ code: 'limite_commande', typeId: t.id, max: t.limiteParCommande });
      const pris = await tx.ticketType.updateMany({ where: { id: t.id, restant: { gte: l.quantite } }, data: { restant: { decrement: l.quantite } } });
      if (pris.count === 0) throw new CommandeRefusee({ code: 'plus_assez', typeId: t.id });
      sousTotal += t.prixCdf * l.quantite;
      lignes.push({ typeBillet: { connect: { id: t.id } }, quantite: l.quantite, prixUnitaire: t.prixCdf });
    }

    let remise = 0;
    let promoId: string | null = null;
    if (p.codePromo) {
      const r = await remisePromo(tx, p.codePromo, e.id, p.telephone, sousTotal);
      remise = r.remise;
      promoId = r.promo.id;
    }
    const total = sousTotal - remise;
    const bps = e.organisateur?.commissionBps ?? commissionGlobale;
    const com = commission(total, bps);

    let code = codeCommande();
    while (await tx.order.findUnique({ where: { code }, select: { id: true } })) code = codeCommande();

    const commande = await tx.order.create({
      data: {
        code, telephone: p.telephone, userId: p.userId, evenementId: e.id, langue: langueSure(p.langue),
        sousTotal: sousTotal, remise: remise, total: total, commissionBps: bps, montantCommission: com, netOrganisateur: total - com,
        reserveJusquau: new Date(maintenant.getTime() + RESERVATION_MS),
        lignes: { create: lignes },
        ...(promoId ? { promo: { create: { promoId, telephone: p.telephone, remise: remise } } } : {}),
      },
    });

    // Commande gratuite : pas de paiement, billets tout de suite.
    if (total === 0) {
      await tx.order.update({ where: { id: commande.id }, data: { statut: 'PAYEE', mode: 'GRATUIT', payeeLe: maintenant } });
      await genererBillets(tx, commande.id);
    }
    return { ...commande, statut: total === 0 ? ('PAYEE' as const) : commande.statut };
  });
}

/** Rend les places d'une commande (une seule fois, grâce au drapeau stockLibere). */
export async function libererStock(tx: Prisma.TransactionClient, commandeId: string, statut: 'EXPIREE' | 'ANNULEE' | 'ECHOUEE'): Promise<boolean> {
  const pris = await tx.order.updateMany({ where: { id: commandeId, stockLibere: false, statut: 'EN_ATTENTE' }, data: { statut, stockLibere: true } });
  if (pris.count === 0) return false;
  const lignes = await tx.orderItem.findMany({ where: { commandeId } });
  for (const l of lignes) await tx.ticketType.update({ where: { id: l.typeBilletId }, data: { restant: { increment: l.quantite } } });
  const promo = await tx.promoRedemption.findUnique({ where: { commandeId } });
  if (promo) await tx.promoCode.update({ where: { id: promo.promoId }, data: { utilise: { decrement: 1 } } });
  return true;
}

/**
 * Expire les réservations échues (10 minutes, 2 heures en paiement chez un agent) et rend les places.
 * Un paiement confirmé plus tard retente la réservation (voir lib/paiement/confirmation.ts) ;
 * s'il n'y a plus de place, la commande passe en PAYEE_SANS_PLACE.
 */
export async function expirerReservations(maintenant = new Date()): Promise<number> {
  const echues = await db.order.findMany({ where: { statut: 'EN_ATTENTE', reserveJusquau: { lt: maintenant } }, select: { id: true }, take: 500 });
  let n = 0;
  for (const c of echues) if (await db.$transaction((tx) => libererStock(tx, c.id, 'EXPIREE'))) n++;
  return n;
}

/**
 * Reprend les places d'une commande dont la réservation avait expiré (paiement confirmé en retard).
 * Tout ou rien, sans lever d'erreur (la transaction de confirmation continue) : si une catégorie
 * n'a plus assez de places, les places déjà reprises sont rendues et la fonction renvoie false.
 */
export async function reprendreStock(tx: Prisma.TransactionClient, commandeId: string): Promise<boolean> {
  const lignes = await tx.orderItem.findMany({ where: { commandeId } });
  const reprises: typeof lignes = [];
  for (const l of lignes) {
    const pris = await tx.ticketType.updateMany({ where: { id: l.typeBilletId, restant: { gte: l.quantite } }, data: { restant: { decrement: l.quantite } } });
    if (pris.count === 0) {
      for (const r of reprises) await tx.ticketType.update({ where: { id: r.typeBilletId }, data: { restant: { increment: r.quantite } } });
      return false;
    }
    reprises.push(l);
  }
  return true;
}
