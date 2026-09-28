import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { creerCommande, expirerReservations } from '@/lib/commandes';
import { db } from '@/lib/db';
import { demanderPaiement, remplacerFournisseurPaiement, traiterWebhook, verifierPaiementsEnAttente, DUREE_VERIF_MS } from '@/lib/paiement';
import type { PaymentProvider, StatutNormalise } from '@/lib/paiement/fournisseur';
import { declarerPaiementManuel, refuserReclamation, validerReclamation } from '@/lib/paiement/manuel';
import { reglerDelaiSimulation, signerSimulation, SIGNATURE_SIMULATION, SimulationProvider } from '@/lib/paiement/simulation';
import { referentiel, viderBase } from './aide-db';

async function evenement(quota = 10, restant = quota) {
  const admin = await db.user.upsert({ where: { telephone: '+243990000009' }, update: {}, create: { telephone: '+243990000009', roles: ['ADMIN'] } });
  return db.event.create({
    data: { code: 'P' + Math.random().toString(36).slice(2, 7).toUpperCase(), slug: 'p-' + Math.random().toString(36).slice(2), titre: 'Paiement', statut: 'PUBLIE', selAffichage: 's', creeParId: admin.id, debutLe: new Date(Date.now() + 86400_000),
      typesBillet: { create: { nom: 'Std', prixCdf: 25000, quota, restant } } },
    include: { typesBillet: true },
  });
}
const commande = async (quota = 10, qte = 2, tel = '+243971000111') => {
  const e = await evenement(quota);
  return { e, c: await creerCommande({ telephone: tel, userId: null, evenementId: e.id, lignes: [{ typeId: e.typesBillet[0]!.id, quantite: qte }] }) };
};
const webhook = (paiementId: string, statut: string, montant: number, id = `evt-${paiementId}`) => {
  const corps = JSON.stringify({ id, reference: `SIM-${paiementId}`, paiementId, statut, montant });
  return { corps, entetes: new Headers({ [SIGNATURE_SIMULATION]: signerSimulation(corps) }) };
};

describe('paiement Mobile Money', () => {
  beforeAll(() => { reglerDelaiSimulation(10 ** 9); });
  beforeEach(async () => { await viderBase(); await referentiel(); remplacerFournisseurPaiement(null); });
  afterAll(async () => { await db.$disconnect(); });

  it('un webhook reçu trois fois ne crée qu’un seul lot de billets', async () => {
    const { c } = await commande();
    const d = await demanderPaiement({ commandeId: c.id, telephone: '+243971000111', operateur: 'AIRTEL', nouvelle: false });
    expect(d.ok).toBe(true);
    const id = (d as { paiementId: string }).paiementId;
    const reponses = await Promise.all([1, 2, 3].map(() => traiterWebhook('simulation', webhook(id, 'REUSSI', 50000))));
    expect(reponses.every((r) => r.code === 200)).toBe(true);
    expect(await db.ticket.count({ where: { commandeId: c.id } })).toBe(2);
    expect((await db.order.findUniqueOrThrow({ where: { id: c.id } })).statut).toBe('PAYEE');
    expect(await db.paymentEvent.count()).toBe(1);
    expect(await db.smsLog.count({ where: { gabarit: 'billets' } })).toBe(1);
    await traiterWebhook('simulation', webhook(id, 'REUSSI', 50000));
    expect(await db.ticket.count({ where: { commandeId: c.id } })).toBe(2);
  });

  it('signature invalide : refusé, corps brut enregistré avant tout traitement', async () => {
    const { c } = await commande();
    const d = await demanderPaiement({ commandeId: c.id, telephone: '+243971000111', operateur: 'AIRTEL', nouvelle: false });
    const w = webhook((d as { paiementId: string }).paiementId, 'REUSSI', 50000);
    const r = await traiterWebhook('simulation', { corps: w.corps, entetes: new Headers({ [SIGNATURE_SIMULATION]: 'faux' }) });
    expect(r.code).toBe(401);
    expect(await db.paymentEvent.findFirst({ where: { signatureValide: false } })).toMatchObject({ corpsBrut: w.corps });
    expect(await db.ticket.count()).toBe(0);
  });

  it('montant différent : pas de billets', async () => {
    const { c } = await commande();
    const d = await demanderPaiement({ commandeId: c.id, telephone: '+243971000111', operateur: 'AIRTEL', nouvelle: false });
    await traiterWebhook('simulation', webhook((d as { paiementId: string }).paiementId, 'REUSSI', 100));
    expect(await db.ticket.count()).toBe(0);
  });

  it('double clic ou rechargement : une seule demande de paiement', async () => {
    const { c } = await commande();
    const r = await Promise.all(Array.from({ length: 5 }, () => demanderPaiement({ commandeId: c.id, telephone: '+243971000111', operateur: 'MPESA', nouvelle: false })));
    expect(new Set(r.map((x) => (x as { paiementId: string }).paiementId)).size).toBe(1);
    expect(await db.payment.count()).toBe(1);
    const relances = await Promise.all([1, 2].map(() => demanderPaiement({ commandeId: c.id, telephone: '+243971000111', operateur: 'MPESA', nouvelle: true })));
    expect(new Set(relances.map((x) => (x as { paiementId: string }).paiementId)).size).toBe(1);
    expect(await db.payment.count()).toBe(2);
  });

  it('paiement confirmé après expiration : places reprises si possible, sinon PAYEE_SANS_PLACE et SMS', async () => {
    const { e, c } = await commande(2, 2);
    const d = await demanderPaiement({ commandeId: c.id, telephone: '+243971000111', operateur: 'AIRTEL', nouvelle: false });
    await db.order.update({ where: { id: c.id }, data: { reserveJusquau: new Date(Date.now() - 1000) } });
    await expirerReservations();
    await creerCommande({ telephone: '+243971000222', userId: null, evenementId: e.id, lignes: [{ typeId: e.typesBillet[0]!.id, quantite: 1 }] });
    await traiterWebhook('simulation', webhook((d as { paiementId: string }).paiementId, 'REUSSI', 50000));
    expect((await db.order.findUniqueOrThrow({ where: { id: c.id } })).statut).toBe('PAYEE_SANS_PLACE');
    expect(await db.ticket.count({ where: { commandeId: c.id } })).toBe(0);
    expect(await db.smsLog.count({ where: { gabarit: 'payee_sans_place' } })).toBe(1);
    expect((await db.ticketType.findUniqueOrThrow({ where: { id: e.typesBillet[0]!.id } })).restant).toBe(1);
  });

  it('paiement confirmé après expiration avec des places libres : payé normalement', async () => {
    const { e, c } = await commande(10, 2);
    const d = await demanderPaiement({ commandeId: c.id, telephone: '+243971000111', operateur: 'AIRTEL', nouvelle: false });
    await db.order.update({ where: { id: c.id }, data: { reserveJusquau: new Date(Date.now() - 1000) } });
    await expirerReservations();
    await traiterWebhook('simulation', webhook((d as { paiementId: string }).paiementId, 'REUSSI', 50000));
    expect((await db.order.findUniqueOrThrow({ where: { id: c.id } })).statut).toBe('PAYEE');
    expect((await db.ticketType.findUniqueOrThrow({ where: { id: e.typesBillet[0]!.id } })).restant).toBe(8);
  });

  it('vérification planifiée : 90 s puis toutes les 2 min, confirmation sans webhook, expiration à 15 min', async () => {
    let reponse: StatutNormalise = 'EN_ATTENTE';
    const faux: PaymentProvider = Object.assign(new SimulationProvider(), { verifierStatut: async (ref: string | null) => ({ statut: reponse, referenceOperateur: ref, brut: reponse }) });
    remplacerFournisseurPaiement(faux);
    const { c } = await commande();
    const d = await demanderPaiement({ commandeId: c.id, telephone: '+243971000111', operateur: 'ORANGE', nouvelle: false });
    const id = (d as { paiementId: string }).paiementId;
    expect((await verifierPaiementsEnAttente()).verifies).toBe(0); // avant 90 s
    const dans = (ms: number) => new Date(Date.now() + ms);
    expect((await verifierPaiementsEnAttente(dans(91_000))).verifies).toBe(1);
    expect((await db.payment.findUniqueOrThrow({ where: { id } })).nbVerifications).toBe(1);
    reponse = 'REUSSI';
    expect((await verifierPaiementsEnAttente(dans(91_000 + 121_000))).confirmes).toBe(1);
    expect(await db.ticket.count({ where: { commandeId: c.id } })).toBe(2);

    reponse = 'EN_ATTENTE';
    const { c: c2 } = await commande(10, 1, '+243971000333');
    await demanderPaiement({ commandeId: c2.id, telephone: '+243971000333', operateur: 'ORANGE', nouvelle: false });
    expect((await verifierPaiementsEnAttente(dans(DUREE_VERIF_MS + 1000))).expires).toBe(1);
  });

  it('paiement manuel : référence unique, validation par un agent, refus avec SMS', async () => {
    const agent = await db.user.create({ data: { telephone: '+243990000077', roles: ['AGENT'] } });
    const { c } = await commande();
    expect(await declarerPaiementManuel({ commandeId: c.id, operateur: 'MPESA', reference: 'ab 12345 cd', telephonePayeur: '+243811112222' })).toEqual({ ok: true });
    const commande2 = (await commande(10, 1, '+243971000444')).c;
    expect(await declarerPaiementManuel({ commandeId: commande2.id, operateur: 'MPESA', reference: 'AB12345CD', telephonePayeur: '+243811112222' })).toEqual({ ok: false, raison: 'reference_utilisee' });
    const apres = await db.order.findUniqueOrThrow({ where: { id: c.id } });
    expect(apres.reserveJusquau.getTime() - Date.now()).toBeGreaterThan(110 * 60_000);
    const r = await db.manualPaymentClaim.findFirstOrThrow({ where: { commandeId: c.id } });
    expect(await validerReclamation(r.id, agent)).toBe('payee');
    expect(await validerReclamation(r.id, agent)).toBe('deja_traite');
    expect(await db.ticket.count({ where: { commandeId: c.id } })).toBe(2);

    await declarerPaiementManuel({ commandeId: commande2.id, operateur: 'ORANGE', reference: 'XYZ98765', telephonePayeur: '+243851112222' });
    const r2 = await db.manualPaymentClaim.findFirstOrThrow({ where: { commandeId: commande2.id } });
    expect(await refuserReclamation(r2.id, agent, 'Introuvable')).toBe(true);
    expect(await db.smsLog.count({ where: { gabarit: 'reclamation_refusee' } })).toBe(1);
  });
  it('simulation : la vérification planifiée retrouve l’issue quand le webhook se perd (staging sur Vercel)', async () => {
    const sim = new SimulationProvider();
    const cmd = { paiementId: 'p1', codeCommande: 'C1', montantCdf: 1000, cleIdempotence: 'c:1' };
    const ref = async (tel: string) => (await sim.initier(cmd, tel, 'AIRTEL')).referenceOperateur;
    expect((await sim.verifierStatut(await ref('+243971230001'))).statut).toBe('REUSSI');
    expect((await sim.verifierStatut(await ref('+243971230000'))).statut).toBe('ECHOUE');
    expect((await sim.verifierStatut(await ref('+243971239999'))).statut).toBe('EN_ATTENTE');
    expect((await sim.verifierStatut(null)).statut).toBe('EN_ATTENTE');
  });
  it('commande passée en anglais : SMS des billets en anglais, avec le titre anglais', async () => {
    const e = await evenement();
    await db.event.update({ where: { id: e.id }, data: { titreEn: 'River concert' } });
    const c = await creerCommande({ telephone: '+243971000555', userId: null, evenementId: e.id, lignes: [{ typeId: e.typesBillet[0]!.id, quantite: 1 }], langue: 'en' });
    expect(c.langue).toBe('en');
    const d = await demanderPaiement({ commandeId: c.id, telephone: '+243971000555', operateur: 'AIRTEL', nouvelle: false });
    await traiterWebhook('simulation', webhook((d as { paiementId: string }).paiementId, 'REUSSI', 25000));
    const sms = await db.smsLog.findFirstOrThrow({ where: { telephone: '+243971000555', gabarit: 'billets' } });
    expect(sms.contenu).toMatch(/^e-Ticket RDC: payment received, your tickets for River concert are ready/);
  });
});
