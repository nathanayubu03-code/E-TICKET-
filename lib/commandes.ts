import { commission } from './argent';
import { codeCommande, genererBillets } from './billets/generation';
import { db, type Prisma } from './db';
import { langueSure } from './langue';
import { parametre, tauxCourant } from './parametres';

export const RESERVATION_MS = 10 * 60_000;
export const RESERVATION_MANUELLE_MS = 2 * 3600_000;

export type ErreurCommande =
  | { code: 'evenement_indisponible' }
  | { code: 'ligne_invalide' }
  | { code: 'vente_fermee' }
  | { code: 'plus_assez'; typeId: string }
  | { code: 'limite_personne'; max: number }
  | { code: 'limite_commande'; typeId: string; max: number }
  | { code: 'promo_invalide' };

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
  const remise = promo.type === 'POURCENTAGE' ? Math.floor((sousTotal * promo.valeur) / 10000) : Math.min(promo.valeur, sousTotal);
  return { promo, remise };
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
  const [limiteGlobale, commissionGlobale, taux] = await Promise.all([parametre('limite_billets'), parametre('commission_bps'), tauxCourant()]);

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
      lignes.push({ typeBillet: { connect: { id: t.id } }, quantite: l.quantite, prixUnitaireCdf: t.prixCdf });
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
        sousTotalCdf: sousTotal, remiseCdf: remise, totalCdf: total, commissionBps: bps, commissionCdf: com, netOrganisateurCdf: total - com,
        tauxUsdId: taux?.id ?? null, reserveJusquau: new Date(maintenant.getTime() + RESERVATION_MS),
        lignes: { create: lignes },
        ...(promoId ? { promo: { create: { promoId, telephone: p.telephone, remiseCdf: remise } } } : {}),
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
