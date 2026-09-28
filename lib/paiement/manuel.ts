import { auditer, type Acteur } from '@/lib/audit';
import { reprendreStock, RESERVATION_MANUELLE_MS } from '@/lib/commandes';
import { db, Prisma, type Operateur } from '@/lib/db';
import { envoyerSms } from '@/lib/sms';
import { smsReclamationRefusee } from '@/lib/sms/gabarits';
import { payerCommande, type Issue } from './confirmation';

export const normaliserReference = (r: string) => r.toUpperCase().replace(/[^A-Z0-9.\-]/g, '');

export type ResultatDeclaration = { ok: true } | { ok: false; raison: 'commande_indisponible' | 'reference_utilisee' | 'reference_invalide' | 'plus_de_place' };

/**
 * L'acheteur déclare avoir payé chez un agent : référence de transaction reçue par SMS de son opérateur.
 * Une référence ne sert qu'une fois (contrainte unique opérateur + référence). Réservation prolongée à 2 heures.
 */
export async function declarerPaiementManuel(p: { commandeId: string; operateur: Operateur; reference: string; telephonePayeur: string }): Promise<ResultatDeclaration> {
  const reference = normaliserReference(p.reference);
  if (reference.length < 5 || reference.length > 40) return { ok: false, raison: 'reference_invalide' };
  try {
    return await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM "Order" WHERE "id" = ${p.commandeId} FOR UPDATE`;
      const c = await tx.order.findUniqueOrThrow({ where: { id: p.commandeId } });
      if (!(c.statut === 'EN_ATTENTE' || c.statut === 'EXPIREE') || c.total <= 0) return { ok: false, raison: 'commande_indisponible' } as const;
      if (c.stockLibere && !(await reprendreStock(tx, c.id))) return { ok: false, raison: 'plus_de_place' } as const;
      // Montant et devise attendus : ceux de la commande (devise choisie juste avant, voir choisirDevise).
      await tx.manualPaymentClaim.create({ data: { commandeId: c.id, operateur: p.operateur, referenceTransaction: reference, telephonePayeur: p.telephonePayeur, montant: c.total, devise: c.devise } });
      await tx.order.update({ where: { id: c.id }, data: { statut: 'EN_ATTENTE', stockLibere: false, mode: 'MANUEL', reserveJusquau: new Date(Date.now() + RESERVATION_MANUELLE_MS) } });
      return { ok: true } as const;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return { ok: false, raison: 'reference_utilisee' };
    throw e;
  }
}

/** Un AGENT valide : la réclamation passe VALIDEE et la commande PAYEE dans la même transaction. */
export async function validerReclamation(reclamationId: string, agent: Acteur): Promise<Issue> {
  const r = await db.manualPaymentClaim.findUniqueOrThrow({ where: { id: reclamationId } });
  const issue = await payerCommande(r.commandeId, 'MANUEL', async (tx) => {
    const pris = await tx.manualPaymentClaim.updateMany({ where: { id: reclamationId, statut: 'EN_ATTENTE' }, data: { statut: 'VALIDEE', traiteParId: agent.id, traiteLe: new Date() } });
    return pris.count === 1;
  });
  await auditer({ acteur: agent, action: 'paiement_manuel.valider', entite: 'ManualPaymentClaim', entiteId: reclamationId, apres: { issue, reference: r.referenceTransaction, montant: r.montant } });
  return issue;
}

export async function refuserReclamation(reclamationId: string, agent: Acteur, motif: string): Promise<boolean> {
  const pris = await db.manualPaymentClaim.updateMany({ where: { id: reclamationId, statut: 'EN_ATTENTE' }, data: { statut: 'REFUSEE', traiteParId: agent.id, traiteLe: new Date(), motifRefus: motif.slice(0, 300) } });
  if (pris.count === 0) return false;
  const r = await db.manualPaymentClaim.findUniqueOrThrow({ where: { id: reclamationId }, include: { commande: { select: { code: true, telephone: true, langue: true } } } });
  await envoyerSms(r.commande.telephone, 'reclamation_refusee', smsReclamationRefusee(r.commande.code, r.commande.langue));
  await auditer({ acteur: agent, action: 'paiement_manuel.refuser', entite: 'ManualPaymentClaim', entiteId: reclamationId, apres: { motif } });
  return true;
}
