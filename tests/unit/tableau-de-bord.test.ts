import ExcelJS from 'exceljs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { annulerCommande, marquerRemboursee } from '@/lib/admin/commandes';
import { exportVentes } from '@/lib/admin/export';
import { parCategorie, parOperateur, reversementsDus, totaux } from '@/lib/admin/stats';
import { creerCommande } from '@/lib/commandes';
import { db } from '@/lib/db';
import { payerCommande } from '@/lib/paiement/confirmation';
import { referentiel, viderBase } from './aide-db';

async function venteDe(prix: number, qte: number, tel: string, evenementId: string, typeId: string) {
  const c = await creerCommande({ telephone: tel, userId: null, evenementId, lignes: [{ typeId, quantite: qte }] });
  await db.payment.create({ data: { commandeId: c.id, fournisseur: 'test', operateur: 'MPESA', telephone: tel, montant: c.total, cleIdempotence: `${c.id}:0`, statut: 'REUSSI', referenceOperateur: `REF-${c.code}` } });
  await payerCommande(c.id, 'MOBILE_MONEY');
  return c;
}

describe('tableau de bord, reversements, exports', () => {
  beforeEach(async () => { await viderBase(); await referentiel(); });
  afterAll(async () => { await db.$disconnect(); });

  it('base vide : des zéros, pas de valeur fictive', async () => {
    expect(await totaux({})).toEqual({ commandes: 0, billets: 0, parDevise: { CDF: { brut: 0, commission: 0, net: 0 }, USD: { brut: 0, commission: 0, net: 0 } } });
    expect(await parOperateur({})).toEqual([]);
    expect(await parCategorie({})).toEqual([]);
    expect(await reversementsDus()).toEqual([]);
  });

  it('totaux, répartition, reversements et export Excel cohérents', async () => {
    const admin = await db.user.create({ data: { telephone: '+243990000009', roles: ['ADMIN'] } });
    const orga = await db.organizer.create({ data: { nom: 'Orga', slug: 'orga-tb', commissionBps: 1000 } });
    const e = await db.event.create({ data: { code: 'TBEV01', slug: 'tb', titre: 'Concert TB', statut: 'PUBLIE', selAffichage: 's', creeParId: admin.id, organisateurId: orga.id, debutLe: new Date(Date.now() + 86400_000), typesBillet: { create: { nom: 'Std', prixCdf: 20000, quota: 50, restant: 50 } } }, include: { typesBillet: true } });
    const t = e.typesBillet[0]!.id;
    await venteDe(20000, 2, '+243811000001', e.id, t);
    await venteDe(20000, 1, '+243811000002', e.id, t);
    const tot = await totaux({});
    expect(tot).toEqual({ commandes: 2, billets: 3, parDevise: { CDF: { brut: 60000, commission: 6000, net: 54000 }, USD: { brut: 0, commission: 0, net: 0 } } });
    expect(await parOperateur({})).toEqual([{ nom: 'M-Pesa', fond: '#007A3D', devise: 'CDF', montant: 60000 }]);
    await db.payout.create({ data: { organisateurId: orga.id, evenementId: e.id, montant: 50000, referenceTransaction: 'VIR-1', effectueLe: new Date(), saisiParId: admin.id } });
    const [r] = await reversementsDus();
    expect(r!.soldes.CDF).toMatchObject({ net: 54000, verse: 50000, reste: 4000 });
    expect(r!.devises).toEqual(['CDF']);
    const fichier = await exportVentes(e.id, { telephonesComplets: false });
    const classeur = new ExcelJS.Workbook();
    await classeur.xlsx.load(fichier as unknown as ArrayBuffer);
    const commandes = classeur.getWorksheet('Commandes')!;
    expect(commandes.rowCount).toBe(3);
    expect(String(commandes.getRow(2).getCell(4).value)).toMatch(/^\+243 81 \*\*\* \*\* \d\d$/);
    expect(classeur.getWorksheet('Billets')!.rowCount).toBe(4);
  });

  it('annulation et remboursement : billets invalidés, places rendues une seule fois', async () => {
    const admin = await db.user.create({ data: { telephone: '+243990000009', roles: ['ADMIN'] } });
    const e = await db.event.create({ data: { code: 'TBEV02', slug: 'tb2', titre: 'Match', statut: 'PUBLIE', selAffichage: 's', creeParId: admin.id, debutLe: new Date(Date.now() + 86400_000), typesBillet: { create: { nom: 'Std', prixCdf: 1000, quota: 10, restant: 10 } } }, include: { typesBillet: true } });
    const t = e.typesBillet[0]!.id;
    const c = await venteDe(1000, 2, '+243811000003', e.id, t);
    expect((await db.ticketType.findUniqueOrThrow({ where: { id: t } })).restant).toBe(8);
    await annulerCommande(c.id, admin);
    expect((await db.ticket.findMany({ where: { commandeId: c.id } })).every((b) => b.statut === 'ANNULE')).toBe(true);
    expect((await db.ticketType.findUniqueOrThrow({ where: { id: t } })).restant).toBe(10);
    await marquerRemboursee(c.id, admin, 'test');
    expect((await db.order.findUniqueOrThrow({ where: { id: c.id } })).statut).toBe('REMBOURSEE');
    expect((await db.ticketType.findUniqueOrThrow({ where: { id: t } })).restant).toBe(10);
  });
});
