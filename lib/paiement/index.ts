import { createHash } from 'node:crypto';
import type { Devise } from '@/lib/argent';
import { auditer } from '@/lib/audit';
import { choisirDevise } from '@/lib/commandes';
import { db, Prisma, type Operateur } from '@/lib/db';
import { env } from '@/lib/env';
import { infoOperateur } from '@/lib/operateurs';
import { appliquerStatut } from './confirmation';
import { PaiementIndisponible, type PaymentProvider, type RequeteBrute } from './fournisseur';
import { brancherLivraisonSimulation, SIGNATURE_SIMULATION, SimulationProvider } from './simulation';

export const PREMIERE_VERIF_MS = 90_000;
export const INTERVALLE_VERIF_MS = 120_000;
export const DUREE_VERIF_MS = 15 * 60_000;

let instance: PaymentProvider | null = null;
export function fournisseurPaiement(): PaymentProvider {
  if (instance) return instance;
  switch (env().PAYMENT_PROVIDER) {
    case 'simulation':
      instance = new SimulationProvider();
      // La simulation remet ses réponses au même traitement que les webhooks réels.
      brancherLivraisonSimulation(async (corps, signature) => { await traiterWebhook('simulation', { corps, entetes: new Headers({ [SIGNATURE_SIMULATION]: signature }) }); });
      break;
    default: throw new PaiementIndisponible();
  }
  return instance;
}
export function remplacerFournisseurPaiement(f: PaymentProvider | null) { instance = f; }

export type ResultatDemande = { ok: true; paiementId: string } | { ok: false; raison: 'commande_indisponible' | 'reservation_expiree' | 'paiement_indisponible' | 'echec_fournisseur' | 'devise_indisponible' | 'devise_operateur' };

/**
 * Lance une demande de paiement. Un double clic ou un rechargement renvoie la demande en cours
 * (contrainte unique sur la clé d'idempotence). Seul « Renvoyer la demande » (nouvelle = true)
 * crée une nouvelle tentative.
 */
export async function demanderPaiement(p: { commandeId: string; telephone: string; operateur: Operateur; nouvelle: boolean; devise?: Devise }): Promise<ResultatDemande> {
  let fournisseur: PaymentProvider;
  try { fournisseur = fournisseurPaiement(); } catch { return { ok: false, raison: 'paiement_indisponible' }; }
  if (p.devise) {
    if (!infoOperateur(p.operateur).devises.includes(p.devise)) return { ok: false, raison: 'devise_operateur' };
    // Sans effet si la commande est déjà dans cette devise ; refusé si un paiement est en cours dans l'autre.
    const choix = await choisirDevise(p.commandeId, p.devise);
    if (!choix.ok && choix.raison === 'devise_indisponible') return { ok: false, raison: 'devise_indisponible' };
  }
  const c = await db.order.findUnique({ where: { id: p.commandeId }, include: { paiements: { orderBy: { creeLe: 'desc' } } } });
  if (!c || c.statut !== 'EN_ATTENTE' || c.total <= 0) return { ok: false, raison: 'commande_indisponible' };
  if (c.reserveJusquau < new Date()) return { ok: false, raison: 'reservation_expiree' };
  const enCours = c.paiements.find((x) => x.statut === 'INITIE' || x.statut === 'EN_ATTENTE');
  if (enCours && !p.nouvelle) return { ok: true, paiementId: enCours.id };

  const cle = `${c.id}:${c.paiements.length}`;
  let paiement;
  try {
    paiement = await db.payment.create({ data: { commandeId: c.id, fournisseur: fournisseur.nom, operateur: p.operateur, telephone: p.telephone, montant: c.total, devise: c.devise, cleIdempotence: cle } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const existant = await db.payment.findUniqueOrThrow({ where: { cleIdempotence: cle } });
      return { ok: true, paiementId: existant.id };
    }
    throw e;
  }
  try {
    const r = await fournisseur.initier({ paiementId: paiement.id, codeCommande: c.code, montant: c.total, devise: c.devise, cleIdempotence: cle }, p.telephone, p.operateur);
    await db.payment.update({ where: { id: paiement.id }, data: { statut: r.statut === 'EN_ATTENTE' ? 'EN_ATTENTE' : paiement.statut, referenceOperateur: r.referenceOperateur, statutBrut: r.brut, prochaineVerifLe: new Date(Date.now() + PREMIERE_VERIF_MS) } });
    if (r.statut !== 'EN_ATTENTE') await appliquerStatut(paiement.id, r.statut, r.referenceOperateur, r.brut);
    await db.order.update({ where: { id: c.id }, data: { mode: 'MOBILE_MONEY' } });
    await auditer({ action: 'paiement.initier', entite: 'Payment', entiteId: paiement.id, apres: { commande: c.code, operateur: p.operateur, montant: c.total, devise: c.devise } });
    return { ok: true, paiementId: paiement.id };
  } catch (e) {
    await db.payment.update({ where: { id: paiement.id }, data: { statut: 'ECHOUE', motifEchec: e instanceof Error ? e.message.slice(0, 300) : 'erreur' } });
    return { ok: false, raison: 'echec_fournisseur' };
  }
}

/**
 * Traite un webhook : corps brut enregistré dans PaymentEvent avant tout, signature vérifiée,
 * puis application idempotente. Le même webhook reçu trois fois ne produit les billets qu'une fois.
 */
export async function traiterWebhook(nomFournisseur: string, requete: RequeteBrute): Promise<{ code: number; message: string }> {
  let fournisseur: PaymentProvider;
  try { fournisseur = fournisseurPaiement(); } catch { return { code: 503, message: 'indisponible' }; }
  const entetes = Object.fromEntries(requete.entetes.entries());
  const empreinte = createHash('sha256').update(requete.corps).digest('hex');
  if (nomFournisseur !== fournisseur.nom) {
    await db.paymentEvent.create({ data: { fournisseur: nomFournisseur, cleDedup: `inconnu:${empreinte}:${Date.now()}`, corpsBrut: requete.corps, entetes, signatureValide: false, erreur: 'fournisseur non configuré' } });
    return { code: 404, message: 'fournisseur inconnu' };
  }
  const evt = await fournisseur.verifierWebhook(requete);
  const cleDedup = evt ? `${fournisseur.nom}:${evt.cleDedup}` : `${fournisseur.nom}:invalide:${empreinte}:${Date.now()}`;
  let enregistrement;
  try {
    enregistrement = await db.paymentEvent.create({ data: { fournisseur: fournisseur.nom, cleDedup, corpsBrut: requete.corps, entetes, signatureValide: Boolean(evt) } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      // Doublon : déjà reçu. On ne retraite que si le premier traitement a échoué.
      const premier = await db.paymentEvent.findUniqueOrThrow({ where: { cleDedup } });
      if (premier.traiteLe) return { code: 200, message: 'déjà traité' };
      enregistrement = premier;
    } else throw e;
  }
  if (!evt) return { code: 401, message: 'signature invalide' };
  const paiement = evt.paiementId
    ? await db.payment.findUnique({ where: { id: evt.paiementId } })
    : evt.referenceOperateur ? await db.payment.findUnique({ where: { referenceOperateur: evt.referenceOperateur } }) : null;
  if (!paiement) {
    await db.paymentEvent.update({ where: { id: enregistrement.id }, data: { erreur: 'paiement introuvable', traiteLe: new Date() } });
    return { code: 200, message: 'paiement introuvable' };
  }
  if ((evt.montant !== null && evt.montant !== paiement.montant) || (evt.devise !== null && evt.devise !== paiement.devise)) {
    await db.paymentEvent.update({ where: { id: enregistrement.id }, data: { paiementId: paiement.id, erreur: `montant différent : ${evt.montant} ${evt.devise ?? ''}`.trim(), traiteLe: new Date() } });
    await auditer({ action: 'paiement.montant_different', entite: 'Payment', entiteId: paiement.id, apres: { attendu: paiement.montant, deviseAttendue: paiement.devise, recu: evt.montant, deviseRecue: evt.devise } });
    return { code: 200, message: 'montant différent' };
  }
  const issue = await appliquerStatut(paiement.id, evt.statut, evt.referenceOperateur, evt.brut);
  await db.paymentEvent.update({ where: { id: enregistrement.id }, data: { paiementId: paiement.id, traiteLe: new Date(), erreur: null } });
  return { code: 200, message: issue };
}

/**
 * Vérification planifiée des paiements sans webhook : première à 90 s, puis toutes les 2 minutes
 * pendant 15 minutes. Tient la promesse « vos billets arrivent tout seuls par SMS dans les 15 minutes ».
 */
export async function verifierPaiementsEnAttente(maintenant = new Date()): Promise<{ verifies: number; confirmes: number; expires: number }> {
  let fournisseur: PaymentProvider;
  try { fournisseur = fournisseurPaiement(); } catch { return { verifies: 0, confirmes: 0, expires: 0 }; }
  const aVerifier = await db.payment.findMany({ where: { statut: { in: ['INITIE', 'EN_ATTENTE'] }, prochaineVerifLe: { lte: maintenant } }, take: 100, orderBy: { prochaineVerifLe: 'asc' } });
  let confirmes = 0, expires = 0;
  for (const p of aVerifier) {
    try {
      const r = await fournisseur.verifierStatut(p.referenceOperateur, p.id);
      if (r.statut !== 'EN_ATTENTE') {
        const issue = await appliquerStatut(p.id, r.statut, r.referenceOperateur, r.brut);
        if (issue === 'payee' || issue === 'payee_sans_place') confirmes++;
        continue;
      }
    } catch { /* fournisseur injoignable : on retentera */ }
    const age = maintenant.getTime() - p.creeLe.getTime();
    if (age >= DUREE_VERIF_MS) {
      await appliquerStatut(p.id, 'EXPIRE', p.referenceOperateur, 'SANS_REPONSE_15_MIN');
      expires++;
    } else {
      await db.payment.update({ where: { id: p.id }, data: { nbVerifications: { increment: 1 }, prochaineVerifLe: new Date(maintenant.getTime() + INTERVALLE_VERIF_MS) } });
    }
  }
  return { verifies: aVerifier.length, confirmes, expires };
}
