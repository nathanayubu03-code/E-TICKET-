import ExcelJS from 'exceljs';
import { db } from '@/lib/db';
import { dateLongue } from '@/lib/fuseaux';
import { infoOperateur } from '@/lib/operateurs';
import { masquerTelephone } from '@/lib/telephone';

/** Classeur des ventes d'un événement : commandes, billets, synthèse. Montants en CDF entiers. */
export async function exportVentes(evenementId: string, { telephonesComplets }: { telephonesComplets: boolean }): Promise<Buffer> {
  const e = await db.event.findUniqueOrThrow({ where: { id: evenementId }, include: { organisateur: true } });
  const commandes = await db.order.findMany({
    where: { evenementId, statut: { in: ['PAYEE', 'PAYEE_SANS_PLACE', 'REMBOURSEE', 'ANNULEE'] }, payeeLe: { not: null } },
    orderBy: { payeeLe: 'asc' },
    include: { lignes: { include: { typeBillet: true } }, paiements: { where: { statut: 'REUSSI' } }, reclamations: { where: { statut: 'VALIDEE' } }, billets: { include: { typeBillet: true } } },
  });
  const fuseau = e.fuseau ?? undefined;
  const tel = (t: string) => (telephonesComplets ? t : masquerTelephone(t));
  const classeur = new ExcelJS.Workbook();
  classeur.creator = 'e-Ticket RDC';
  classeur.created = new Date();

  const fc = classeur.addWorksheet('Commandes');
  fc.columns = [
    { header: 'Commande', key: 'code', width: 12 }, { header: 'Payée le', key: 'date', width: 22 }, { header: 'Statut', key: 'statut', width: 16 },
    { header: 'Téléphone', key: 'tel', width: 18 }, { header: 'Mode', key: 'mode', width: 14 }, { header: 'Opérateur', key: 'op', width: 14 },
    { header: 'Référence', key: 'ref', width: 22 }, { header: 'Billets', key: 'billets', width: 8 }, { header: 'Brut (CDF)', key: 'brut', width: 14 },
    { header: 'Remise (CDF)', key: 'remise', width: 13 }, { header: 'Commission (CDF)', key: 'com', width: 16 }, { header: 'Net organisateur (CDF)', key: 'net', width: 20 },
  ];
  for (const c of commandes) {
    const p = c.paiements[0];
    const r = c.reclamations[0];
    const op = p?.operateur ?? r?.operateur;
    fc.addRow({ code: c.code, date: c.payeeLe ? dateLongue(c.payeeLe, fuseau) : '', statut: c.statut, tel: tel(c.telephone), mode: c.mode ?? '', op: op ? infoOperateur(op).nom : '', ref: p?.referenceOperateur ?? r?.referenceTransaction ?? '', billets: c.lignes.reduce((s, l) => s + l.quantite, 0), brut: c.totalCdf, remise: c.remiseCdf, com: c.commissionCdf, net: c.netOrganisateurCdf });
  }
  fc.getRow(1).font = { bold: true };

  const fb = classeur.addWorksheet('Billets');
  fb.columns = [{ header: 'Billet', key: 'id', width: 16 }, { header: 'Commande', key: 'cmd', width: 12 }, { header: 'Catégorie', key: 'cat', width: 20 }, { header: 'Prix (CDF)', key: 'prix', width: 12 }, { header: 'Statut', key: 'statut', width: 12 }, { header: 'Premier scan', key: 'scan', width: 22 }, { header: 'Porte', key: 'porte', width: 10 }];
  for (const c of commandes) for (const b of c.billets) fb.addRow({ id: b.publicId, cmd: c.code, cat: b.typeBillet.nom, prix: b.prixPayeCdf, statut: b.statut, scan: b.premierScanLe ? dateLongue(b.premierScanLe, fuseau) : '', porte: b.premierePorte ?? '' });
  fb.getRow(1).font = { bold: true };

  const payees = commandes.filter((c) => c.statut === 'PAYEE');
  const fs = classeur.addWorksheet('Synthèse');
  fs.columns = [{ header: 'Indicateur', key: 'k', width: 32 }, { header: 'Valeur', key: 'v', width: 22 }];
  fs.addRows([
    { k: 'Événement', v: e.titre }, { k: 'Organisateur', v: e.organisateur?.nom ?? '' }, { k: 'Commandes payées', v: payees.length },
    { k: 'Billets vendus', v: payees.reduce((s, c) => s + c.lignes.reduce((a, l) => a + l.quantite, 0), 0) },
    { k: 'Brut (CDF)', v: payees.reduce((s, c) => s + c.totalCdf, 0) }, { k: 'Commission (CDF)', v: payees.reduce((s, c) => s + c.commissionCdf, 0) },
    { k: 'Net organisateur (CDF)', v: payees.reduce((s, c) => s + c.netOrganisateurCdf, 0) }, { k: 'Exporté le', v: dateLongue(new Date(), fuseau) },
  ]);
  fs.getRow(1).font = { bold: true };
  return Buffer.from(await classeur.xlsx.writeBuffer());
}
