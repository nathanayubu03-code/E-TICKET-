import { montant } from '@/lib/argent';
import { auditer } from '@/lib/audit';
import { genererBillets } from '@/lib/billets/generation';
import { reprendreStock } from '@/lib/commandes';
import { db, type ModePaiement, type Prisma } from '@/lib/db';
import { envoyerSms } from '@/lib/sms';
import { texteEvenement } from '@/lib/langue';
import { smsBillets, smsPayeeSansPlace } from '@/lib/sms/gabarits';
import type { StatutNormalise } from './fournisseur';

export type Issue = 'payee' | 'payee_sans_place' | 'deja_traite' | 'double_paiement' | 'echec' | 'ignore';

/**
 * Passe une commande en PAYEE et génère ses billets, dans une seule transaction.
 * Idempotent : un deuxième appel pour la même commande ne fait rien.
 * Réservation expirée : reprise des places si possible, sinon PAYEE_SANS_PLACE (à rembourser).
 */
export async function payerCommande(commandeId: string, mode: ModePaiement, marquer?: (tx: Prisma.TransactionClient) => Promise<boolean>): Promise<Issue> {
  const issue = await db.$transaction(async (tx) => {
    // Marque la preuve de paiement (paiement ou réclamation) dans la même transaction : tout ou rien.
    if (marquer && !(await marquer(tx))) return 'deja_traite' as const;
    await tx.$executeRaw`SELECT 1 FROM "Order" WHERE "id" = ${commandeId} FOR UPDATE`;
    const c = await tx.order.findUniqueOrThrow({ where: { id: commandeId } });
    if (c.statut === 'PAYEE' || c.statut === 'PAYEE_SANS_PLACE') return 'double_paiement' as const;
    if (c.statut !== 'EN_ATTENTE' && c.statut !== 'EXPIREE') return 'ignore' as const;
    let places = !c.stockLibere;
    if (!places) places = await reprendreStock(tx, commandeId);
    if (!places) {
      await tx.order.update({ where: { id: commandeId }, data: { statut: 'PAYEE_SANS_PLACE', mode, payeeLe: new Date() } });
      return 'payee_sans_place' as const;
    }
    await tx.order.update({ where: { id: commandeId }, data: { statut: 'PAYEE', mode, payeeLe: new Date(), stockLibere: false } });
    await genererBillets(tx, commandeId);
    return 'payee' as const;
  });
  // SMS après la transaction : un SMS en échec ne défait pas un paiement.
  if (issue === 'payee' || issue === 'payee_sans_place') {
    const c = await db.order.findUniqueOrThrow({ where: { id: commandeId }, include: { evenement: { select: { titre: true, titreEn: true } }, billets: { select: { code: true } } } });
    const titre = texteEvenement(c.evenement, 'titre', c.langue);
    await envoyerSms(c.telephone, issue === 'payee' ? 'billets' : 'payee_sans_place', issue === 'payee' ? smsBillets(titre, c.billets.map((b) => b.code), c.langue, c.total > 0 ? montant(c.total, c.devise, c.langue) : undefined) : smsPayeeSansPlace(titre, c.code, c.langue));
    await auditer({ action: issue === 'payee' ? 'commande.payee' : 'commande.payee_sans_place', entite: 'Order', entiteId: commandeId, apres: { mode, billets: c.billets.length } });
  }
  return issue;
}

/**
 * Applique un statut vérifié côté serveur (webhook signé ou verifierStatut) à un paiement.
 * Jamais appelé sur la base d'un retour navigateur.
 */
export async function appliquerStatut(paiementId: string, statut: StatutNormalise, referenceOperateur: string | null, brut: string): Promise<Issue> {
  if (statut === 'EN_ATTENTE') return 'ignore';
  if (statut === 'REUSSI') {
    const p = await db.payment.findUniqueOrThrow({ where: { id: paiementId } });
    const issue = await payerCommande(p.commandeId, 'MOBILE_MONEY', async (tx) => {
      const pris = await tx.payment.updateMany({ where: { id: paiementId, statut: { not: 'REUSSI' } }, data: { statut: 'REUSSI', statutBrut: brut, confirmeLe: new Date(), ...(referenceOperateur ? { referenceOperateur } : {}), prochaineVerifLe: null } });
      return pris.count === 1;
    });
    if (issue === 'double_paiement') await auditer({ action: 'paiement.double', entite: 'Payment', entiteId: paiementId, apres: { commandeId: p.commandeId, montant: p.montant } });
    return issue;
  }
  const pris = await db.payment.updateMany({ where: { id: paiementId, statut: { in: ['INITIE', 'EN_ATTENTE'] } }, data: { statut, statutBrut: brut, prochaineVerifLe: null } });
  return pris.count ? 'echec' : 'deja_traite';
}
