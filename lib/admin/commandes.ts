import { auditer, type Acteur } from '@/lib/audit';
import { libererStock } from '@/lib/commandes';
import { db, type Prisma } from '@/lib/db';
import { envoyerSms } from '@/lib/sms';
import { montant } from '@/lib/argent';
import { texteEvenement } from '@/lib/langue';
import { smsBillets } from '@/lib/sms/gabarits';

async function rendrePlaces(tx: Prisma.TransactionClient, commandeId: string) {
  const pris = await tx.order.updateMany({ where: { id: commandeId, stockLibere: false }, data: { stockLibere: true } });
  if (pris.count === 0) return;
  for (const l of await tx.orderItem.findMany({ where: { commandeId } })) await tx.ticketType.update({ where: { id: l.typeBilletId }, data: { restant: { increment: l.quantite } } });
}

/** Annule une commande : en attente, les places sont rendues ; payée, les billets sont annulés et la commande est à rembourser. */
export async function annulerCommande(commandeId: string, acteur: Acteur): Promise<string> {
  const c = await db.order.findUniqueOrThrow({ where: { id: commandeId } });
  if (c.statut === 'EN_ATTENTE') {
    await db.$transaction((tx) => libererStock(tx, commandeId, 'ANNULEE'));
  } else if (c.statut === 'PAYEE') {
    await db.$transaction(async (tx) => {
      await tx.ticket.updateMany({ where: { commandeId }, data: { statut: 'ANNULE' } });
      await rendrePlaces(tx, commandeId);
      await tx.order.update({ where: { id: commandeId }, data: { statut: 'ANNULEE', annuleeLe: new Date() } });
    });
  } else {
    return 'Cette commande ne peut pas être annulée.';
  }
  await auditer({ acteur, action: 'commande.annuler', entite: 'Order', entiteId: commandeId, avant: { statut: c.statut } });
  return c.statut === 'PAYEE' ? 'Commande annulée, billets invalidés. Pensez au remboursement.' : 'Commande annulée, places rendues.';
}

/** Enregistre un remboursement fait hors plateforme (Mobile Money manuel). */
export async function marquerRemboursee(commandeId: string, acteur: Acteur, note: string): Promise<string> {
  const c = await db.order.findUniqueOrThrow({ where: { id: commandeId } });
  if (!['PAYEE', 'PAYEE_SANS_PLACE', 'ANNULEE'].includes(c.statut) || !c.payeeLe) return 'Seule une commande payée peut être remboursée.';
  await db.$transaction(async (tx) => {
    await tx.ticket.updateMany({ where: { commandeId }, data: { statut: 'ANNULE' } });
    if (c.statut === 'PAYEE') await rendrePlaces(tx, commandeId);
    await tx.order.update({ where: { id: commandeId }, data: { statut: 'REMBOURSEE', rembourseeLe: new Date(), rembourseeParId: acteur.id, noteRemboursement: note.slice(0, 300) || null } });
  });
  await auditer({ acteur, action: 'commande.rembourser', entite: 'Order', entiteId: commandeId, avant: { statut: c.statut }, apres: { note } });
  return 'Remboursement enregistré.';
}

export async function renvoyerSmsBillets(commandeId: string, acteur: Acteur): Promise<string> {
  const c = await db.order.findUniqueOrThrow({ where: { id: commandeId }, include: { evenement: { select: { titre: true, titreEn: true } }, billets: { where: { statut: { not: 'ANNULE' } }, select: { code: true } } } });
  if (c.statut !== 'PAYEE' || !c.billets.length) return 'Aucun billet valide à renvoyer.';
  const ok = await envoyerSms(c.telephone, 'billets', smsBillets(texteEvenement(c.evenement, 'titre', c.langue), c.billets.map((b) => b.code), c.langue, c.total > 0 ? montant(c.total, c.devise, c.langue) : undefined));
  await auditer({ acteur, action: 'commande.renvoyer_sms', entite: 'Order', entiteId: commandeId, apres: { ok } });
  return ok ? 'SMS renvoyé.' : "Le SMS n'est pas parti : voir « SMS envoyés ».";
}
