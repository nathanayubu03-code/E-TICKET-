import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { codeAleatoire128, empreinteCode } from '@/lib/billets/generation';
import { CommandeRefusee, creerCommande, expirerReservations, lireLignes, reprendreStock } from '@/lib/commandes';
import { db } from '@/lib/db';
import { referentiel, viderBase } from './aide-db';

async function evenement(types: { prix: number; quota: number; restant?: number }[], extra: { limiteParPersonne?: number } = {}) {
  const admin = await db.user.upsert({ where: { telephone: '+243990000009' }, update: {}, create: { telephone: '+243990000009', roles: ['ADMIN'] } });
  const ville = await db.city.findUniqueOrThrow({ where: { nom: 'Kinshasa' } });
  const lieu = await db.venue.create({ data: { nom: 'L' + Math.random(), villeId: ville.id } });
  const orga = await db.organizer.create({ data: { nom: 'O', slug: 'o-' + Math.random().toString(36).slice(2), commissionBps: 800 } });
  return db.event.create({
    data: { code: 'K' + Math.random().toString(36).slice(2, 7).toUpperCase(), slug: 'k-' + Math.random().toString(36).slice(2), titre: 'T', statut: 'PUBLIE', selAffichage: 's', creeParId: admin.id, lieuId: lieu.id, villeId: ville.id, organisateurId: orga.id, debutLe: new Date(Date.now() + 86400_000), ...extra,
      typesBillet: { create: types.map((t, i) => ({ nom: 'T' + i, prixCdf: t.prix, quota: t.quota, restant: t.restant ?? t.quota, ordre: i })) } },
    include: { typesBillet: { orderBy: { ordre: 'asc' } } },
  });
}
const tel = (i: number) => `+2439710000${String(i).padStart(2, '0')}`;

describe('commandes et réservation', () => {
  beforeEach(async () => { await viderBase(); await referentiel(); });
  afterAll(async () => { await db.$disconnect(); });

  it('20 demandes simultanées sur les 3 dernières places : exactement 3 succès', async () => {
    const e = await evenement([{ prix: 10000, quota: 100, restant: 3 }]);
    const t = e.typesBillet[0]!;
    const resultats = await Promise.allSettled(Array.from({ length: 20 }, (_, i) => creerCommande({ telephone: tel(i), userId: null, evenementId: e.id, lignes: [{ typeId: t.id, quantite: 1 }] })));
    const succes = resultats.filter((r) => r.status === 'fulfilled');
    const refus = resultats.filter((r) => r.status === 'rejected');
    expect(succes).toHaveLength(3);
    expect(refus).toHaveLength(17);
    for (const r of refus) expect((r as PromiseRejectedResult).reason).toBeInstanceOf(CommandeRefusee);
    expect((await db.ticketType.findUniqueOrThrow({ where: { id: t.id } })).restant).toBe(0);
    expect(await db.order.count()).toBe(3);
  });

  it('limite par personne tenue même avec des demandes simultanées du même numéro', async () => {
    const e = await evenement([{ prix: 5000, quota: 100 }]);
    const t = e.typesBillet[0]!;
    const resultats = await Promise.allSettled(Array.from({ length: 6 }, () => creerCommande({ telephone: tel(50), userId: null, evenementId: e.id, lignes: [{ typeId: t.id, quantite: 1 }] })));
    expect(resultats.filter((r) => r.status === 'fulfilled')).toHaveLength(4);
    await expect(creerCommande({ telephone: tel(50), userId: null, evenementId: e.id, lignes: [{ typeId: t.id, quantite: 1 }] })).rejects.toMatchObject({ erreur: { code: 'limite_personne', max: 4 } });
  });

  it('calcule montants et commission de l’organisateur, en entiers CDF', async () => {
    const e = await evenement([{ prix: 150000, quota: 10 }, { prix: 50000, quota: 10 }]);
    const c = await creerCommande({ telephone: tel(1), userId: null, evenementId: e.id, lignes: [{ typeId: e.typesBillet[0]!.id, quantite: 1 }, { typeId: e.typesBillet[1]!.id, quantite: 2 }] });
    expect(c).toMatchObject({ sousTotal: 250000, total: 250000, commissionBps: 800, montantCommission: 20000, netOrganisateur: 230000, statut: 'EN_ATTENTE' });
    expect(c.code).toMatch(/^ET-[A-Z0-9]{6}$/);
    expect(c.reserveJusquau.getTime() - Date.now()).toBeGreaterThan(9 * 60_000);
  });

  it('l’expiration rend les places une seule fois ; une reprise tardive échoue s’il n’y a plus de place', async () => {
    const e = await evenement([{ prix: 1000, quota: 2 }]);
    const t = e.typesBillet[0]!;
    const c = await creerCommande({ telephone: tel(2), userId: null, evenementId: e.id, lignes: [{ typeId: t.id, quantite: 2 }] });
    await db.order.update({ where: { id: c.id }, data: { reserveJusquau: new Date(Date.now() - 1000) } });
    expect(await expirerReservations()).toBe(1);
    expect(await expirerReservations()).toBe(0);
    expect((await db.ticketType.findUniqueOrThrow({ where: { id: t.id } })).restant).toBe(2);
    await creerCommande({ telephone: tel(3), userId: null, evenementId: e.id, lignes: [{ typeId: t.id, quantite: 1 }] });
    expect(await db.$transaction((tx) => reprendreStock(tx, c.id))).toBe(false);
    expect((await db.ticketType.findUniqueOrThrow({ where: { id: t.id } })).restant).toBe(1);
  });

  it('commande gratuite : payée et billets générés tout de suite', async () => {
    const e = await evenement([{ prix: 0, quota: 50 }]);
    const c = await creerCommande({ telephone: tel(4), userId: null, evenementId: e.id, lignes: [{ typeId: e.typesBillet[0]!.id, quantite: 2 }] });
    expect(c.statut).toBe('PAYEE');
    const billets = await db.ticket.findMany({ where: { commandeId: c.id } });
    expect(billets).toHaveLength(2);
    for (const b of billets) {
      expect(b.publicId).toMatch(/^ET-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      expect(b.code).toMatch(/^[A-Z2-7]{26}$/);
      expect(b.codeEmpreinte).toBe(empreinteCode(b.code));
    }
  });

  it('code promo : pourcentage, quota et limite par numéro', async () => {
    const e = await evenement([{ prix: 10000, quota: 50 }]);
    await db.promoCode.create({ data: { code: 'RENTREE', type: 'POURCENTAGE', valeur: 2500, quota: 1, evenementId: e.id } });
    const c = await creerCommande({ telephone: tel(5), userId: null, evenementId: e.id, lignes: [{ typeId: e.typesBillet[0]!.id, quantite: 2 }], codePromo: 'rentree' });
    expect(c).toMatchObject({ sousTotal: 20000, remise: 5000, total: 15000 });
    await expect(creerCommande({ telephone: tel(6), userId: null, evenementId: e.id, lignes: [{ typeId: e.typesBillet[0]!.id, quantite: 1 }], codePromo: 'RENTREE' })).rejects.toMatchObject({ erreur: { code: 'promo_invalide' } });
    expect((await db.ticketType.findUniqueOrThrow({ where: { id: e.typesBillet[0]!.id } })).restant).toBe(48);
  });

  it('refuse un événement non publié et des lignes invalides', async () => {
    const e = await evenement([{ prix: 1000, quota: 5 }]);
    await db.event.update({ where: { id: e.id }, data: { statut: 'BROUILLON' } });
    await expect(creerCommande({ telephone: tel(7), userId: null, evenementId: e.id, lignes: [{ typeId: e.typesBillet[0]!.id, quantite: 1 }] })).rejects.toMatchObject({ erreur: { code: 'evenement_indisponible' } });
    expect(lireLignes('abc:1,cmx1234567890ab:2,cmx1234567890ab:1,zz:-3')).toEqual([{ typeId: 'cmx1234567890ab', quantite: 3 }]);
  });

  it('code aléatoire : 128 bits en base32, sans collision sur 10 000 tirages', () => {
    const codes = new Set(Array.from({ length: 10000 }, codeAleatoire128));
    expect(codes.size).toBe(10000);
    for (const c of [...codes].slice(0, 50)) expect(c).toMatch(/^[A-Z2-7]{26}$/);
  });
});
