import ExcelJS from 'exceljs';
import { DEVISES, type Devise } from '@/lib/argent';
import { db } from '@/lib/db';
import { dateLongue } from '@/lib/fuseaux';
import { infoOperateur } from '@/lib/operateurs';
import { masquerTelephone } from '@/lib/telephone';

// Montants en unités de leur devise (francs pour le CDF, dollars avec centimes pour l'USD), avec une
// colonne Devise. CDF et USD ne sont jamais additionnés : la synthèse a une ligne par devise.
const enUnites = (n: number, d: Devise) => (d === 'USD' ? n / 100 : n);

/** Classeur des ventes d'un événement : commandes, billets, synthèse. */
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
    { header: 'Référence', key: 'ref', width: 22 }, { header: 'Billets', key: 'billets', width: 8 }, { header: 'Devise', key: 'devise', width: 8 }, { header: 'Brut', key: 'brut', width: 14 },
    { header: 'Remise', key: 'remise', width: 13 }, { header: 'Commission', key: 'com', width: 16 }, { header: 'Net organisateur', key: 'net', width: 20 },
  ];
  for (const c of commandes) {
    const p = c.paiements[0];
    const r = c.reclamations[0];
    const op = p?.operateur ?? r?.operateur;
    fc.addRow({ code: c.code, date: c.payeeLe ? dateLongue(c.payeeLe, fuseau) : '', statut: c.statut, tel: tel(c.telephone), mode: c.mode ?? '', op: op ? infoOperateur(op).nom : '', ref: p?.referenceOperateur ?? r?.referenceTransaction ?? '', billets: c.lignes.reduce((s, l) => s + l.quantite, 0), devise: c.devise, brut: enUnites(c.total, c.devise), remise: enUnites(c.remise, c.devise), com: enUnites(c.montantCommission, c.devise), net: enUnites(c.netOrganisateur, c.devise) });
  }
  fc.getRow(1).font = { bold: true };

  const fb = classeur.addWorksheet('Billets');
  fb.columns = [{ header: 'Billet', key: 'id', width: 16 }, { header: 'Commande', key: 'cmd', width: 12 }, { header: 'Catégorie', key: 'cat', width: 20 }, { header: 'Devise', key: 'devise', width: 8 }, { header: 'Prix', key: 'prix', width: 12 }, { header: 'Statut', key: 'statut', width: 12 }, { header: 'Premier scan', key: 'scan', width: 22 }, { header: 'Porte', key: 'porte', width: 10 }];
  for (const c of commandes) for (const b of c.billets) fb.addRow({ id: b.publicId, cmd: c.code, cat: b.typeBillet.nom, devise: b.devise, prix: enUnites(b.prixPaye, b.devise), statut: b.statut, scan: b.premierScanLe ? dateLongue(b.premierScanLe, fuseau) : '', porte: b.premierePorte ?? '' });
  fb.getRow(1).font = { bold: true };

  const payees = commandes.filter((c) => c.statut === 'PAYEE');
  const fs = classeur.addWorksheet('Synthèse');
  fs.columns = [{ header: 'Indicateur', key: 'k', width: 32 }, { header: 'Valeur', key: 'v', width: 22 }];
  fs.addRows([
    { k: 'Événement', v: e.titre }, { k: 'Organisateur', v: e.organisateur?.nom ?? '' }, { k: 'Commandes payées', v: payees.length },
    { k: 'Billets vendus', v: payees.reduce((s, c) => s + c.lignes.reduce((a, l) => a + l.quantite, 0), 0) },
    ...DEVISES.flatMap((d) => {
      const enD = payees.filter((c) => c.devise === d);
      if (d === 'USD' && enD.length === 0) return [];
      return [
        { k: `Commandes payées en ${d}`, v: enD.length },
        { k: `Brut (${d})`, v: enUnites(enD.reduce((s, c) => s + c.total, 0), d) }, { k: `Commission (${d})`, v: enUnites(enD.reduce((s, c) => s + c.montantCommission, 0), d) },
        { k: `Net organisateur (${d})`, v: enUnites(enD.reduce((s, c) => s + c.netOrganisateur, 0), d) },
      ];
    }),
    { k: 'Exporté le', v: dateLongue(new Date(), fuseau) },
  ]);
  fs.getRow(1).font = { bold: true };
  return Buffer.from(await classeur.xlsx.writeBuffer());
}
