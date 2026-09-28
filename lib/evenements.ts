import { db, type Prisma } from './db';

// Événements visibles du public : publiés ou complets, non archivés, pas encore passés.
export const STATUTS_PUBLICS = ['PUBLIE', 'COMPLET'] as const;
const MARGE_MS = 6 * 3600_000; // un événement du jour reste visible 6 h après son début

export function filtrePublic(maintenant = new Date()): Prisma.EventWhereInput {
  return { statut: { in: [...STATUTS_PUBLICS] }, archiveLe: null, debutLe: { gte: new Date(maintenant.getTime() - MARGE_MS) } };
}

const selectionListe = {
  id: true, code: true, slug: true, titre: true, titreEn: true, sousTitre: true, genre: true, statut: true,
  debutLe: true, ouverturePortesLe: true, fuseau: true, afficheVariantes: true, description: true, descriptionEn: true,
  categorie: { select: { slug: true, nom: true, icone: true, fond: true, texte: true } },
  ville: { select: { nom: true, slug: true, fuseau: true } },
  lieu: { select: { nom: true } },
  typesBillet: { select: { prixCdf: true, quota: true, restant: true, nom: true }, orderBy: { ordre: 'asc' } },
} satisfies Prisma.EventSelect;

export type EvenementListe = Prisma.EventGetPayload<{ select: typeof selectionListe }> & {
  prixMin: number; restantTotal: number; complet: boolean; nomsTypes: string[];
};

function enrichir(e: Prisma.EventGetPayload<{ select: typeof selectionListe }>): EvenementListe {
  const prix = e.typesBillet.map((t) => t.prixCdf);
  const restantTotal = e.typesBillet.reduce((s, t) => s + t.restant, 0);
  return { ...e, prixMin: prix.length ? Math.min(...prix) : 0, restantTotal, complet: e.statut === 'COMPLET' || (e.typesBillet.length > 0 && restantTotal === 0), nomsTypes: e.typesBillet.map((t) => t.nom) };
}

export interface Filtres { ville?: string; cat?: string; q?: string }

export async function evenementsPublics(filtres: Filtres = {}): Promise<EvenementListe[]> {
  const q = filtres.q?.trim();
  const where: Prisma.EventWhereInput = {
    ...filtrePublic(),
    ...(filtres.ville ? { ville: { slug: filtres.ville } } : {}),
    ...(filtres.cat ? { categorie: { slug: filtres.cat } } : {}),
    ...(q ? { OR: [
      { titre: { contains: q, mode: 'insensitive' } },
      { titreEn: { contains: q, mode: 'insensitive' } },
      { sousTitre: { contains: q, mode: 'insensitive' } },
      { lieu: { nom: { contains: q, mode: 'insensitive' } } },
      { ville: { nom: { contains: q, mode: 'insensitive' } } },
    ] } : {}),
  };
  const liste = await db.event.findMany({ where, select: selectionListe, orderBy: { debutLe: 'asc' }, take: 60 });
  return liste.map(enrichir);
}

/** Villes et catégories qui ont au moins un événement public, pour les filtres et le pied de page. */
export async function villesEtCategoriesPubliques() {
  const evts = await db.event.findMany({ where: filtrePublic(), select: { ville: { select: { nom: true, slug: true } }, categorie: { select: { slug: true, nom: true, icone: true, fond: true, texte: true, ordre: true } } } });
  const villes = new Map<string, { nom: string; slug: string }>();
  const cats = new Map<string, { slug: string; nom: string; icone: string; fond: string; texte: string; ordre: number }>();
  for (const e of evts) {
    if (e.ville) villes.set(e.ville.slug, e.ville);
    if (e.categorie) cats.set(e.categorie.slug, e.categorie);
  }
  return {
    villes: [...villes.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
    categories: [...cats.values()].sort((a, b) => a.ordre - b.ordre),
  };
}

const inclusionDetails = {
  categorie: true, ville: true, lieu: true,
  organisateur: { select: { nom: true, verifie: true } },
  programme: { orderBy: { ordre: 'asc' } },
  typesBillet: { orderBy: { ordre: 'asc' } },
} satisfies Prisma.EventInclude;

export type EvenementDetail = Prisma.EventGetPayload<{ include: typeof inclusionDetails }>;

export async function evenementPublic(slug: string): Promise<EvenementDetail | null> {
  return db.event.findFirst({ where: { slug, statut: { in: ['PUBLIE', 'COMPLET', 'ANNULE', 'TERMINE'] }, archiveLe: null }, include: inclusionDetails });
}

/** Aperçu dans l'administration : même rendu, quel que soit le statut. */
export async function evenementPourApercu(id: string): Promise<EvenementDetail | null> {
  return db.event.findUnique({ where: { id }, include: inclusionDetails });
}
