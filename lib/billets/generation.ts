import { createHash, randomBytes } from 'node:crypto';
import type { Prisma } from '@/lib/db';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const LISIBLE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans 0/O ni 1/I, pour la lecture à voix haute

/** 128 bits aléatoires encodés en base32 (26 caractères, sans remplissage). */
export function codeAleatoire128(): string {
  const octets = randomBytes(16);
  let bits = 0, valeur = 0, sortie = '';
  for (const o of octets) {
    valeur = (valeur << 8) | o;
    bits += 8;
    while (bits >= 5) { sortie += BASE32[(valeur >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) sortie += BASE32[(valeur << (5 - bits)) & 31];
  return sortie;
}

export const empreinteCode = (code: string) => createHash('sha256').update(code).digest('hex');

function lisible(n: number): string {
  return Array.from(randomBytes(n), (b) => LISIBLE[b % LISIBLE.length]).join('');
}
export const identifiantBillet = () => `ET-${lisible(4)}-${lisible(4)}`;
export const codeCommande = () => `ET-${lisible(6)}`;

/**
 * Génère les billets d'une commande payée, dans la transaction de confirmation.
 * Idempotent : si la commande a déjà des billets, ne fait rien.
 */
export async function genererBillets(tx: Prisma.TransactionClient, commandeId: string): Promise<number> {
  if ((await tx.ticket.count({ where: { commandeId } })) > 0) return 0;
  const commande = await tx.order.findUniqueOrThrow({ where: { id: commandeId }, include: { lignes: true } });
  const donnees: Prisma.TicketCreateManyInput[] = [];
  for (const l of commande.lignes) {
    for (let i = 0; i < l.quantite; i++) {
      const code = codeAleatoire128();
      donnees.push({ publicId: identifiantBillet(), code, codeEmpreinte: empreinteCode(code), commandeId, evenementId: commande.evenementId, typeBilletId: l.typeBilletId, prixPaye: l.prixUnitaire, devise: commande.devise });
    }
  }
  await tx.ticket.createMany({ data: donnees });
  return donnees.length;
}
