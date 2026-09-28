import ExcelJS from 'exceljs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { exportVentes } from '@/lib/admin/export';
import { parOperateur, reversementsDus, totaux } from '@/lib/admin/stats';
import { lireDollars, montant, prixDouble } from '@/lib/argent';
import { choisirDevise, creerCommande, montantsPossibles } from '@/lib/commandes';
import { db } from '@/lib/db';
import { OPERATEURS } from '@/lib/operateurs';
import { demanderPaiement, remplacerFournisseurPaiement, traiterWebhook } from '@/lib/paiement';
import { declarerPaiementManuel, validerReclamation } from '@/lib/paiement/manuel';
import { reglerDelaiSimulation, signerSimulation, SIGNATURE_SIMULATION } from '@/lib/paiement/simulation';
import { referentiel, viderBase } from './aide-db';

const webhook = (paiementId: string, statut: string, montant: number, devise?: string) => {
  const corps = JSON.stringify({ id: `evt-${paiementId}-${statut}-${montant}-${devise}`, reference: `SIM-${paiementId}`, paiementId, statut, montant, devise });
  return { corps, entetes: new Headers({ [SIGNATURE_SIMULATION]: signerSimulation(corps) }) };
};

async function evenement(types: { nom: string; prixCdf: number; prixUsd: number | null }[]) {
  const admin = await db.user.upsert({ where: { telephone: '+243990000009' }, update: {}, create: { telephone: '+243990000009', roles: ['ADMIN'] } });
  const orga = await db.organizer.create({ data: { nom: 'Orga', slug: 'orga-' + Math.random().toString(36).slice(2, 7), commissionBps: 1000 } });
  return db.event.create({
    data: { code: 'D' + Math.random().toString(36).slice(2, 7).toUpperCase(), slug: 'd-' + Math.random().toString(36).slice(2), titre: 'Devises', statut: 'PUBLIE', selAffichage: 's', creeParId: admin.id, organisateurId: orga.id, debutLe: new Date(Date.now() + 86400_000),
      typesBillet: { create: types.map((t, i) => ({ ...t, quota: 50, restant: 50, ordre: i })) } },
    include: { typesBillet: { orderBy: { ordre: 'asc' } } },
  });
}

describe('formatage des montants', () => {
  it('CDF en francs, USD en centimes, jamais de conversion', () => {
    expect(montant(25000, 'CDF', 'fr')).toBe('25 000 CDF');
    expect(montant(1000, 'USD', 'fr')).toBe('10 USD');
    expect(montant(1050, 'USD', 'fr')).toBe('10,50 USD');
    expect(montant(1050, 'USD', 'en')).toBe('10.50 USD');
    expect(prixDouble(25000, 1000, 'fr')).toBe('25 000 CDF · 10 USD');
    expect(prixDouble(25000, null, 'fr')).toBe('25 000 CDF');
    expect(lireDollars('10')).toBe(1000);
    expect(lireDollars('10,5')).toBe(1050);
    expect(lireDollars('10.505')).toBeNull();
    expect(lireDollars('dix')).toBeNull();
  });
  it('chaque opérateur déclare ses devises (CDF et USD, à confirmer)', () => {
    for (const o of OPERATEURS) {
      expect(o.devises).toEqual(['CDF', 'USD']);
      expect(o.devisesAConfirmer).toBe(true);
    }
  });
});

describe('paiement en CDF ou en USD', () => {
  beforeAll(() => { reglerDelaiSimulation(10 ** 9); });
  beforeEach(async () => { await viderBase(); await referentiel(); remplacerFournisseurPaiement(null); });
  afterAll(async () => { await db.$disconnect(); });

  it('paiement en USD de bout en bout : commande, demande, webhook, billets, SMS', async () => {
    const e = await evenement([{ nom: 'Standard', prixCdf: 25000, prixUsd: 1000 }]);
    const c = await creerCommande({ telephone: '+243971000601', userId: null, evenementId: e.id, lignes: [{ typeId: e.typesBillet[0]!.id, quantite: 2 }] });
    expect(c.devise).toBe('CDF');
    expect(c.total).toBe(50000);
    const possibles = await montantsPossibles(c.id);
    expect(possibles!.USD!.total).toBe(2000);

    const d = await demanderPaiement({ commandeId: c.id, telephone: '+243971000601', operateur: 'MPESA', nouvelle: false, devise: 'USD' });
    expect(d.ok).toBe(true);
    const commande = await db.order.findUniqueOrThrow({ where: { id: c.id }, include: { lignes: true } });
    expect(commande).toMatchObject({ devise: 'USD', sousTotal: 2000, total: 2000, montantCommission: 200, netOrganisateur: 1800 });
    expect(commande.lignes[0]!.prixUnitaire).toBe(1000);
    const paiement = await db.payment.findUniqueOrThrow({ where: { id: (d as { paiementId: string }).paiementId } });
    expect(paiement).toMatchObject({ montant: 2000, devise: 'USD' });

    // La réponse de l'opérateur dans la mauvaise devise n'est pas acceptée.
    await traiterWebhook('simulation', webhook(paiement.id, 'REUSSI', 2000, 'CDF'));
    expect(await db.ticket.count({ where: { commandeId: c.id } })).toBe(0);

    await traiterWebhook('simulation', webhook(paiement.id, 'REUSSI', 2000, 'USD'));
    const billets = await db.ticket.findMany({ where: { commandeId: c.id } });
    expect(billets).toHaveLength(2);
    expect(billets.every((b) => b.devise === 'USD' && b.prixPaye === 1000)).toBe(true);
    const sms = await db.smsLog.findFirstOrThrow({ where: { telephone: '+243971000601', gabarit: 'billets' } });
    expect(sms.contenu).toContain('paiement reçu (20 USD)');
  });

  it('refus du paiement en USD si une catégorie du panier n’a pas de prix en USD', async () => {
    const e = await evenement([{ nom: 'Avec USD', prixCdf: 25000, prixUsd: 1000 }, { nom: 'Sans USD', prixCdf: 10000, prixUsd: null }]);
    const c = await creerCommande({ telephone: '+243971000602', userId: null, evenementId: e.id, lignes: [{ typeId: e.typesBillet[0]!.id, quantite: 1 }, { typeId: e.typesBillet[1]!.id, quantite: 1 }] });
    expect((await montantsPossibles(c.id))!.USD).toBeNull();
    expect(await demanderPaiement({ commandeId: c.id, telephone: '+243971000602', operateur: 'AIRTEL', nouvelle: false, devise: 'USD' })).toEqual({ ok: false, raison: 'devise_indisponible' });
    expect(await db.payment.count({ where: { commandeId: c.id } })).toBe(0);
    expect((await db.order.findUniqueOrThrow({ where: { id: c.id } })).devise).toBe('CDF');
  });

  it('pas de changement de devise pendant une demande en cours', async () => {
    const e = await evenement([{ nom: 'Standard', prixCdf: 25000, prixUsd: 1000 }]);
    const c = await creerCommande({ telephone: '+243971000603', userId: null, evenementId: e.id, lignes: [{ typeId: e.typesBillet[0]!.id, quantite: 1 }] });
    await demanderPaiement({ commandeId: c.id, telephone: '+243971000603', operateur: 'ORANGE', nouvelle: false, devise: 'CDF' });
    expect(await choisirDevise(c.id, 'USD')).toEqual({ ok: false, raison: 'paiement_en_cours' });
    expect((await db.order.findUniqueOrThrow({ where: { id: c.id } })).total).toBe(25000);
  });

  it('codes promo : un pourcentage s’applique aux deux devises, un montant fixe seulement dans sa devise', async () => {
    const e = await evenement([{ nom: 'Standard', prixCdf: 20000, prixUsd: 800 }]);
    await db.promoCode.create({ data: { code: 'DIX', type: 'POURCENTAGE', valeur: 1000 } });
    await db.promoCode.create({ data: { code: 'MOINS5000', type: 'MONTANT', valeur: 5000, devise: 'CDF' } });
    const avecPourcent = await creerCommande({ telephone: '+243971000604', userId: null, evenementId: e.id, lignes: [{ typeId: e.typesBillet[0]!.id, quantite: 1 }], codePromo: 'dix' });
    const p1 = await montantsPossibles(avecPourcent.id);
    expect([p1!.CDF.total, p1!.USD!.total]).toEqual([18000, 720]);
    const avecFixe = await creerCommande({ telephone: '+243971000605', userId: null, evenementId: e.id, lignes: [{ typeId: e.typesBillet[0]!.id, quantite: 1 }], codePromo: 'MOINS5000' });
    const p2 = await montantsPossibles(avecFixe.id);
    expect([p2!.CDF.total, p2!.USD!.total]).toEqual([15000, 800]);
    expect(await choisirDevise(avecFixe.id, 'USD')).toEqual({ ok: true });
    expect((await db.promoRedemption.findUniqueOrThrow({ where: { commandeId: avecFixe.id } })).remise).toBe(0);
  });

  it('tableau de bord, reversements et export Excel : CDF et USD séparés, jamais additionnés', async () => {
    const e = await evenement([{ nom: 'Standard', prixCdf: 25000, prixUsd: 1000 }]);
    const t = e.typesBillet[0]!.id;
    const payer = async (tel: string, devise: 'CDF' | 'USD') => {
      const c = await creerCommande({ telephone: tel, userId: null, evenementId: e.id, lignes: [{ typeId: t, quantite: 1 }] });
      const d = await demanderPaiement({ commandeId: c.id, telephone: tel, operateur: 'MPESA', nouvelle: false, devise });
      const p = await db.payment.findUniqueOrThrow({ where: { id: (d as { paiementId: string }).paiementId } });
      await traiterWebhook('simulation', webhook(p.id, 'REUSSI', p.montant, p.devise));
    };
    await payer('+243971000611', 'CDF');
    await payer('+243971000612', 'USD');
    await payer('+243971000613', 'USD');
    const tot = await totaux({});
    expect(tot.commandes).toBe(3);
    expect(tot.parDevise.CDF).toEqual({ brut: 25000, commission: 2500, net: 22500 });
    expect(tot.parDevise.USD).toEqual({ brut: 2000, commission: 200, net: 1800 });
    expect(await parOperateur({})).toEqual([
      { nom: 'M-Pesa', fond: '#007A3D', devise: 'CDF', montant: 25000 },
      { nom: 'M-Pesa', fond: '#007A3D', devise: 'USD', montant: 2000 },
    ]);
    const [r] = await reversementsDus();
    expect(r!.devises).toEqual(['CDF', 'USD']);
    expect(r!.soldes.USD).toMatchObject({ net: 1800, reste: 1800 });

    const classeur = new ExcelJS.Workbook();
    await classeur.xlsx.load((await exportVentes(e.id, { telephonesComplets: false })) as unknown as ArrayBuffer);
    const synthese = classeur.getWorksheet('Synthèse')!;
    const valeurs = new Map<string, unknown>();
    synthese.eachRow((row, i) => { if (i > 1) valeurs.set(String(row.getCell(1).value), row.getCell(2).value); });
    expect(valeurs.get('Brut (CDF)')).toBe(25000);
    expect(valeurs.get('Brut (USD)')).toBe(20);
    expect([...valeurs.keys()].some((k) => /^Brut$|Total/.test(k))).toBe(false);
    const commandes = classeur.getWorksheet('Commandes')!;
    const devises: string[] = [];
    commandes.eachRow((row, i) => { if (i > 1) devises.push(String(row.getCell(9).value)); });
    expect(devises.sort()).toEqual(['CDF', 'USD', 'USD']);
  });
  it('paiement chez un agent en USD : l’agent voit la devise et le montant attendus, billets en USD', async () => {
    const e = await evenement([{ nom: 'Standard', prixCdf: 25000, prixUsd: 1000 }]);
    const c = await creerCommande({ telephone: '+243971000621', userId: null, evenementId: e.id, lignes: [{ typeId: e.typesBillet[0]!.id, quantite: 3 }] });
    expect(await choisirDevise(c.id, 'USD')).toEqual({ ok: true });
    expect(await declarerPaiementManuel({ commandeId: c.id, operateur: 'AIRTEL', reference: 'TX-USD-001', telephonePayeur: '+243971000621' })).toEqual({ ok: true });
    const r = await db.manualPaymentClaim.findFirstOrThrow({ where: { commandeId: c.id } });
    expect(r).toMatchObject({ devise: 'USD', montant: 3000 });
    const agent = await db.user.create({ data: { telephone: '+243990000077', roles: ['AGENT'] } });
    expect(await validerReclamation(r.id, agent)).toBe('payee');
    expect((await db.ticket.findMany({ where: { commandeId: c.id } })).every((b) => b.devise === 'USD')).toBe(true);
  });
});
