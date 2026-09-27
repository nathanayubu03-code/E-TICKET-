import { db } from './db';

// Limite de débit à fenêtre fixe, stockée dans PostgreSQL (pas de Redis nécessaire).
// Requête paramétrée : incrément atomique, remise à zéro quand la fenêtre est passée.
export async function limiter(cle: string, max: number, fenetreSecondes: number): Promise<{ ok: boolean; compteur: number }> {
  const lignes = await db.$queryRaw<{ compteur: number }[]>`
    INSERT INTO "RateLimit" ("cle", "compteur", "fenetreDebut") VALUES (${cle}, 1, now())
    ON CONFLICT ("cle") DO UPDATE SET
      "compteur" = CASE WHEN "RateLimit"."fenetreDebut" < now() - make_interval(secs => ${fenetreSecondes}) THEN 1 ELSE "RateLimit"."compteur" + 1 END,
      "fenetreDebut" = CASE WHEN "RateLimit"."fenetreDebut" < now() - make_interval(secs => ${fenetreSecondes}) THEN now() ELSE "RateLimit"."fenetreDebut" END
    RETURNING "compteur"`;
  const compteur = Number(lignes[0]?.compteur ?? 1);
  return { ok: compteur <= max, compteur };
}

export class TropDeDemandes extends Error {
  constructor() { super('trop_de_demandes'); }
}

/** Lève TropDeDemandes si l'une des limites est dépassée. */
export async function exigerLimites(limites: { cle: string; max: number; fenetre: number }[]): Promise<void> {
  for (const l of limites) {
    if (!(await limiter(l.cle, l.max, l.fenetre)).ok) throw new TropDeDemandes();
  }
}
