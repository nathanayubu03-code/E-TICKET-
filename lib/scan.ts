import { empreinteCode } from './billets/generation';
import { db, Prisma, type ResultatScan } from './db';

// Scanner des contrôleurs. Le QR contient CODE_EVENEMENT/CODE_BILLET (128 bits, base32).
// Hors ligne, l'appareil compare l'empreinte SHA-256 du code à la liste téléchargée ;
// en ligne, le serveur tranche. Voir docs/billet.md.

export interface Manifeste {
  evenement: { id: string; code: string; titre: string; selAffichage: string; quota: number };
  billets: [empreinte: string, publicId: string, categorie: string][];
  deja: [empreinte: string, premierScanLe: string, porte: string | null][];
  annules: string[];
  entrees: number;
  heureServeur: number;
}

export async function manifeste(evenementId: string): Promise<Manifeste | null> {
  const e = await db.event.findUnique({ where: { id: evenementId }, include: { typesBillet: { select: { quota: true } } } });
  if (!e) return null;
  const billets = await db.ticket.findMany({ where: { evenementId }, select: { codeEmpreinte: true, publicId: true, statut: true, premierScanLe: true, premierePorte: true, typeBillet: { select: { nom: true } } } });
  return {
    evenement: { id: e.id, code: e.code, titre: e.titre, selAffichage: e.selAffichage, quota: e.typesBillet.reduce((s, t) => s + t.quota, 0) },
    billets: billets.filter((b) => b.statut !== 'ANNULE').map((b) => [b.codeEmpreinte, b.publicId, b.typeBillet.nom]),
    deja: billets.filter((b) => b.statut === 'UTILISE' && b.premierScanLe).map((b) => [b.codeEmpreinte, b.premierScanLe!.toISOString(), b.premierePorte]),
    annules: billets.filter((b) => b.statut === 'ANNULE').map((b) => b.codeEmpreinte),
    entrees: billets.filter((b) => b.statut === 'UTILISE').length,
    heureServeur: Date.now(),
  };
}

export async function appareil(userId: string, evenementId: string, id: string | null, libelle?: string) {
  if (id) {
    const a = await db.scannerDevice.findUnique({ where: { id } });
    if (a && a.userId === userId && a.evenementId === evenementId) return db.scannerDevice.update({ where: { id }, data: { derniereSynchroLe: new Date() } });
  }
  return db.scannerDevice.create({ data: { userId, evenementId, libelle: libelle?.slice(0, 80), derniereSynchroLe: new Date() } });
}

export interface ResultatVerification { resultat: ResultatScan; publicId?: string; premierScanLe?: string; porte?: string | null; conflit?: boolean }

interface EntreeScan { scanClientId: string; evenementId: string; appareilId: string; controleurId: string; porte: string | null; scanneLe: Date; horsLigne: boolean }

async function enregistrerScan(tx: Prisma.TransactionClient, s: EntreeScan & { billetId: string | null; resultat: ResultatScan; chargeBrute?: string | null; conflit?: boolean }) {
  try {
    await tx.scan.create({ data: { scanClientId: s.scanClientId, billetId: s.billetId, evenementId: s.evenementId, appareilId: s.appareilId, controleurId: s.controleurId, resultat: s.resultat, chargeBrute: s.chargeBrute ?? null, porte: s.porte, horsLigne: s.horsLigne, scanneLe: s.scanneLe, conflit: s.conflit ?? false } });
    return true;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return false; // déjà synchronisé
    throw e;
  }
}

/**
 * Vérification en ligne d'un scan. Passage VALIDE → UTILISE par mise à jour conditionnelle :
 * deux contrôleurs qui scannent le même billet au même instant, un seul obtient « Valide ».
 */
export async function verifierEnLigne(p: EntreeScan & { contenu: { evenement: string; code: string } | null; publicId?: string | null; brut: string }): Promise<ResultatVerification> {
  const e = await db.event.findUniqueOrThrow({ where: { id: p.evenementId }, select: { code: true } });
  const deja = await db.scan.findUnique({ where: { scanClientId: p.scanClientId } });
  if (deja) return { resultat: deja.resultat };
  // Saisie manuelle du numéro lisible (QR illisible) : même vérification, par identifiant.
  if (!p.contenu && p.publicId) {
    const b = await db.ticket.findUnique({ where: { publicId: p.publicId }, select: { code: true, evenementId: true } });
    if (b && b.evenementId === p.evenementId) p = { ...p, contenu: { evenement: e.code, code: b.code } };
  }
  if (!p.contenu || p.contenu.evenement !== e.code) {
    await db.$transaction((tx) => enregistrerScan(tx, { ...p, billetId: null, resultat: 'REFUSE', chargeBrute: p.brut.slice(0, 120) }));
    return { resultat: 'REFUSE' };
  }
  const empreinte = empreinteCode(p.contenu.code);
  return db.$transaction(async (tx) => {
    const b = await tx.ticket.findUnique({ where: { codeEmpreinte: empreinte } });
    if (!b || b.evenementId !== p.evenementId || b.statut === 'ANNULE') {
      await enregistrerScan(tx, { ...p, billetId: b?.id ?? null, resultat: 'REFUSE', chargeBrute: p.brut.slice(0, 120) });
      return { resultat: 'REFUSE' as const };
    }
    const pris = await tx.ticket.updateMany({ where: { id: b.id, statut: 'VALIDE' }, data: { statut: 'UTILISE', premierScanLe: p.scanneLe, premierePorte: p.porte } });
    if (pris.count === 1) {
      await enregistrerScan(tx, { ...p, billetId: b.id, resultat: 'VALIDE' });
      return { resultat: 'VALIDE' as const, publicId: b.publicId };
    }
    const actuel = await tx.ticket.findUniqueOrThrow({ where: { id: b.id } });
    await enregistrerScan(tx, { ...p, billetId: b.id, resultat: 'DEJA_SCANNE' });
    return { resultat: 'DEJA_SCANNE' as const, publicId: b.publicId, premierScanLe: actuel.premierScanLe?.toISOString(), porte: actuel.premierePorte };
  });
}

export interface ScanHorsLigne { scanClientId: string; empreinte: string | null; brut: string; resultatLocal: ResultatScan; scanneLe: string; porte: string | null }

/**
 * Synchronisation des scans faits hors ligne. Si deux appareils ont validé le même billet sans réseau,
 * le serveur garde le premier (heure de scan corrigée) et signale le second comme conflit.
 */
export async function synchroniser(p: { evenementId: string; appareilId: string; controleurId: string; scans: ScanHorsLigne[] }): Promise<{ recus: number; conflits: number }> {
  let recus = 0, conflits = 0;
  for (const s of p.scans.slice(0, 500)) {
    const base = { scanClientId: s.scanClientId, evenementId: p.evenementId, appareilId: p.appareilId, controleurId: p.controleurId, porte: s.porte, scanneLe: new Date(s.scanneLe), horsLigne: true };
    if (Number.isNaN(base.scanneLe.getTime())) continue;
    const r = await db.$transaction(async (tx) => {
      if (await tx.scan.findUnique({ where: { scanClientId: s.scanClientId }, select: { id: true } })) return 'deja';
      const b = s.empreinte ? await tx.ticket.findUnique({ where: { codeEmpreinte: s.empreinte } }) : null;
      if (!b || b.evenementId !== p.evenementId) {
        await enregistrerScan(tx, { ...base, billetId: null, resultat: s.resultatLocal === 'INCONNU' ? 'INCONNU' : 'REFUSE', chargeBrute: s.brut.slice(0, 120) });
        return 'recu';
      }
      if (s.resultatLocal !== 'VALIDE') {
        await enregistrerScan(tx, { ...base, billetId: b.id, resultat: s.resultatLocal });
        return 'recu';
      }
      await tx.$executeRaw`SELECT 1 FROM "Ticket" WHERE "id" = ${b.id} FOR UPDATE`;
      const actuel = await tx.ticket.findUniqueOrThrow({ where: { id: b.id } });
      if (actuel.statut === 'VALIDE') {
        await tx.ticket.update({ where: { id: b.id }, data: { statut: 'UTILISE', premierScanLe: base.scanneLe, premierePorte: s.porte } });
        await enregistrerScan(tx, { ...base, billetId: b.id, resultat: 'VALIDE' });
        return 'recu';
      }
      // Déjà utilisé : on garde le scan le plus ancien, l'autre est signalé.
      if (actuel.premierScanLe && base.scanneLe < actuel.premierScanLe) {
        await tx.scan.updateMany({ where: { billetId: b.id, resultat: 'VALIDE', conflit: false }, data: { conflit: true } });
        await tx.ticket.update({ where: { id: b.id }, data: { premierScanLe: base.scanneLe, premierePorte: s.porte } });
        await enregistrerScan(tx, { ...base, billetId: b.id, resultat: 'VALIDE' });
      } else {
        await enregistrerScan(tx, { ...base, billetId: b.id, resultat: 'DEJA_SCANNE', conflit: true });
      }
      return 'conflit';
    });
    if (r !== 'deja') recus++;
    if (r === 'conflit') conflits++;
  }
  await db.scannerDevice.update({ where: { id: p.appareilId }, data: { derniereSynchroLe: new Date() } });
  return { recus, conflits };
}

/** Le contrôleur a-t-il accès à cet événement ? (ADMIN et SUPERADMIN : tous les événements) */
export async function accesScanner(userId: string, roles: string[], evenementId: string): Promise<boolean> {
  if (roles.includes('SUPERADMIN') || roles.includes('ADMIN')) return true;
  return Boolean(await db.eventController.findUnique({ where: { userId_evenementId: { userId, evenementId } } }));
}

export async function appareilAutorise(id: string, userId: string, evenementId: string): Promise<boolean> {
  const a = await db.scannerDevice.findUnique({ where: { id }, select: { userId: true, evenementId: true } });
  return Boolean(a && a.userId === userId && a.evenementId === evenementId);
}
