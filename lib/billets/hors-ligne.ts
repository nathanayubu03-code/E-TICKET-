import { cdf } from '@/lib/argent';
import { db } from '@/lib/db';
import { dateCourte } from '@/lib/fuseaux';
import { contenuQR, dessinQR, type QRDessin } from './qr';

/** Billet tel qu'il est enregistré sur le téléphone (IndexedDB) : tout ce qu'il faut pour l'afficher sans réseau. */
export interface BilletHorsLigne {
  publicId: string;
  categorie: string;
  titulaire: string | null;
  entree: string | null;
  prix: string;
  statut: 'VALIDE' | 'UTILISE' | 'ANNULE';
  evenement: { id: string; titre: string; sousTitre: string | null; quand: string; lieu: string; selAffichage: string; debutLe: string | null };
  qr: QRDessin;
  heureServeur: number; // pour calculer le décalage d'horloge au moment de l'enregistrement
}

export async function billetsHorsLigne(ids: string[]): Promise<BilletHorsLigne[]> {
  if (ids.length === 0) return [];
  const billets = await db.ticket.findMany({ where: { id: { in: ids } }, include: { typeBillet: { select: { nom: true } }, evenement: { include: { lieu: true, ville: true } } }, orderBy: { emisLe: 'asc' } });
  const maintenant = Date.now();
  return billets.map((b) => {
    const e = b.evenement;
    const fuseau = e.ville?.fuseau ?? e.fuseau ?? undefined;
    return {
      publicId: b.publicId, categorie: b.typeBillet.nom, titulaire: b.titulaire, entree: b.entree, prix: cdf(b.prixPayeCdf), statut: b.statut,
      evenement: { id: e.id, titre: e.titre, sousTitre: e.sousTitre, quand: e.debutLe ? dateCourte(e.debutLe, fuseau) : '', lieu: [e.lieu?.nom, e.ville?.nom].filter(Boolean).join(', '), selAffichage: e.selAffichage, debutLe: e.debutLe?.toISOString() ?? null },
      qr: dessinQR(contenuQR(e.code, b.code)),
      heureServeur: maintenant,
    };
  });
}
