import { randomBytes } from 'node:crypto';
import { db, type Prisma } from '@/lib/db';
import { slugifier } from '@/lib/slug';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function codeCourt(longueur = 6): string {
  const o = randomBytes(longueur);
  return Array.from(o, (b) => ALPHABET[b % ALPHABET.length]).join('');
}
export const nouveauSel = () => randomBytes(16).toString('base64url');

export async function slugUnique(titre: string, exclureId?: string): Promise<string> {
  const base = slugifier(titre) || 'evenement';
  for (let i = 0; i < 20; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    const pris = await db.event.findFirst({ where: { slug, ...(exclureId ? { NOT: { id: exclureId } } : {}) }, select: { id: true } });
    if (!pris) return slug;
  }
  return `${base}-${codeCourt(4).toLowerCase()}`;
}

export async function codeEvenementUnique(): Promise<string> {
  for (;;) {
    const code = codeCourt(6);
    if (!(await db.event.findUnique({ where: { code }, select: { id: true } }))) return code;
  }
}

type EvenementComplet = Prisma.EventGetPayload<{ include: { typesBillet: true } }>;

/** Ce qui manque pour publier : au moins un billet avec prix et quota, une date future, un lieu, un organisateur. */
export function manquesPublication(e: EvenementComplet, maintenant = new Date()): string[] {
  const manques: string[] = [];
  if (!e.titre.trim()) manques.push('Un titre');
  if (!e.categorieId) manques.push('Une catégorie');
  if (!e.organisateurId) manques.push('Un organisateur');
  if (!e.lieuId) manques.push('Un lieu');
  if (!e.debutLe) manques.push('Une date et une heure de début');
  else if (e.debutLe <= maintenant) manques.push('Une date de début dans le futur');
  if (!e.typesBillet.some((t) => t.prixCdf >= 0 && t.quota > 0)) manques.push('Au moins une catégorie de billet avec un prix et un quota');
  return manques;
}

/** Duplique un événement en brouillon : billets (stock remis à neuf), programme, lieu. Sans ventes ni affiche. */
export async function dupliquerEvenement(id: string, creeParId: string) {
  const e = await db.event.findUniqueOrThrow({ where: { id }, include: { typesBillet: true, programme: true } });
  const titre = `${e.titre} (copie)`;
  return db.event.create({
    data: {
      code: await codeEvenementUnique(), slug: await slugUnique(titre), titre, sousTitre: e.sousTitre, genre: e.genre, description: e.description,
      categorieId: e.categorieId, organisateurId: e.organisateurId, lieuId: e.lieuId, villeId: e.villeId, fuseau: e.fuseau,
      infosPratiques: e.infosPratiques, limiteParPersonne: e.limiteParPersonne, selAffichage: nouveauSel(), creeParId, statut: 'BROUILLON',
      typesBillet: { create: e.typesBillet.map((t) => ({ nom: t.nom, description: t.description, prixCdf: t.prixCdf, quota: t.quota, restant: t.quota, limiteParCommande: t.limiteParCommande, ordre: t.ordre })) },
      programme: { create: e.programme.map((p) => ({ heure: p.heure, titre: p.titre, detail: p.detail, ordre: p.ordre })) },
    },
  });
}

export class QuotaTropBas extends Error {
  constructor(public vendus: number) { super(`Déjà ${vendus} places vendues ou réservées : le quota ne peut pas être plus bas.`); }
}

/**
 * Change le quota d'une catégorie sans perdre les ventes : le stock restant suit la différence.
 * Ligne verrouillée (SELECT … FOR UPDATE) pour ne pas croiser une réservation en cours.
 */
export async function changerQuota(tx: Prisma.TransactionClient, typeId: string, nouveauQuota: number) {
  const lignes = await tx.$queryRaw<{ quota: number; restant: number }[]>`SELECT "quota", "restant" FROM "TicketType" WHERE "id" = ${typeId} FOR UPDATE`;
  const l = lignes[0];
  if (!l) throw new Error('Catégorie introuvable');
  const vendus = l.quota - l.restant;
  if (nouveauQuota < vendus) throw new QuotaTropBas(vendus);
  await tx.ticketType.update({ where: { id: typeId }, data: { quota: nouveauQuota, restant: nouveauQuota - vendus } });
}
