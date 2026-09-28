import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { changerQuota, dupliquerEvenement, manquesPublication, QuotaTropBas } from '@/lib/admin/evenements';
import { lireRoles, signerRoles } from '@/lib/auth/jeton-roles';
import { envoyerOtp, verifierOtp } from '@/lib/auth/otp';
import { rolesPourChemin } from '@/lib/auth/roles';
import { chiffrer, dechiffrer } from '@/lib/chiffrement';
import { db } from '@/lib/db';
import { localVersUtc, utcVersLocal } from '@/lib/fuseaux';
import { referentiel, viderBase } from './aide-db';

async function evenement(types: { prix: number; quota: number; restant?: number }[] = [{ prix: 1000, quota: 10 }]) {
  const admin = await db.user.upsert({ where: { telephone: '+243990000009' }, update: {}, create: { telephone: '+243990000009', roles: ['ADMIN'] } });
  const ville = await db.city.findUniqueOrThrow({ where: { nom: 'Kinshasa' } });
  const lieu = await db.venue.create({ data: { nom: 'Lieu ' + Math.random(), villeId: ville.id } });
  const orga = await db.organizer.create({ data: { nom: 'Orga', slug: 'orga-' + Math.random().toString(36).slice(2) } });
  return db.event.create({
    data: { code: 'C' + Math.random().toString(36).slice(2, 7).toUpperCase(), slug: 's-' + Math.random().toString(36).slice(2), titre: 'Test', selAffichage: 'sel', creeParId: admin.id, lieuId: lieu.id, villeId: ville.id, organisateurId: orga.id, categorieId: (await db.category.findFirstOrThrow()).id, debutLe: new Date(Date.now() + 86400_000),
      typesBillet: { create: types.map((t, i) => ({ nom: 'T' + i, prixCdf: t.prix, quota: t.quota, restant: t.restant ?? t.quota })) } },
    include: { typesBillet: true, programme: true },
  });
}

describe('administration des événements', () => {
  beforeEach(async () => { await viderBase(); await referentiel(); });
  afterAll(async () => { await db.$disconnect(); });

  it('liste ce qui manque pour publier', async () => {
    const e = await evenement();
    expect(manquesPublication(e)).toEqual([]);
    expect(manquesPublication({ ...e, organisateurId: null, lieuId: null, typesBillet: [] })).toEqual(['Un organisateur', 'Un lieu', 'Au moins une catégorie de billet avec un prix et un quota']);
    expect(manquesPublication({ ...e, debutLe: new Date(Date.now() - 1000) })).toEqual(['Une date de début dans le futur']);
  });

  it('change le quota sans perdre les ventes, refuse un quota sous les ventes', async () => {
    const e = await evenement([{ prix: 1000, quota: 10, restant: 4 }]);
    const t = e.typesBillet[0]!;
    await db.$transaction((tx) => changerQuota(tx, t.id, 20));
    expect(await db.ticketType.findUniqueOrThrow({ where: { id: t.id } })).toMatchObject({ quota: 20, restant: 14 });
    await expect(db.$transaction((tx) => changerQuota(tx, t.id, 5))).rejects.toBeInstanceOf(QuotaTropBas);
    await db.$transaction((tx) => changerQuota(tx, t.id, 6));
    expect(await db.ticketType.findUniqueOrThrow({ where: { id: t.id } })).toMatchObject({ quota: 6, restant: 0 });
  });

  it('duplique en brouillon avec un stock neuf et un nouveau sel', async () => {
    const e = await evenement([{ prix: 1000, quota: 10, restant: 2 }]);
    const c = await dupliquerEvenement(e.id, e.creeParId);
    const copie = await db.event.findUniqueOrThrow({ where: { id: c.id }, include: { typesBillet: true } });
    expect(copie.statut).toBe('BROUILLON');
    expect(copie.typesBillet[0]).toMatchObject({ quota: 10, restant: 10 });
    expect(copie.selAffichage).not.toBe(e.selAffichage);
    expect(copie.code).not.toBe(e.code);
  });
});

describe('OTP', () => {
  beforeEach(async () => { await viderBase(); });

  it('envoie, refuse un renvoi avant 45 s, valide une seule fois', async () => {
    const tel = '+243971112233';
    expect((await envoyerOtp(tel, 'CONNEXION', '1.1.1.1')).ok).toBe(true);
    const r = await envoyerOtp(tel, 'CONNEXION', '1.1.1.1');
    expect(r).toMatchObject({ ok: false, raison: 'trop_tot' });
    const sms = await db.smsLog.findFirstOrThrow({ where: { telephone: tel } });
    const code = /(\d{6})/.exec(sms.contenu)![1]!;
    expect(await verifierOtp(tel, 'CONNEXION', code)).toEqual({ ok: true });
    expect(await verifierOtp(tel, 'CONNEXION', code)).toEqual({ ok: false, raison: 'expire' });
  });

  it('bloque après 5 essais faux', async () => {
    const tel = '+243971112244';
    await envoyerOtp(tel, 'CONNEXION', '1.1.1.2');
    const sms = await db.smsLog.findFirstOrThrow({ where: { telephone: tel } });
    const code = /(\d{6})/.exec(sms.contenu)![1]!;
    const faux = code === '000000' ? '111111' : '000000';
    for (let i = 4; i >= 1; i--) expect(await verifierOtp(tel, 'CONNEXION', faux)).toEqual({ ok: false, raison: 'faux', restants: i });
    expect(await verifierOtp(tel, 'CONNEXION', faux)).toEqual({ ok: false, raison: 'expire' });
    expect(await verifierOtp(tel, 'CONNEXION', code)).toEqual({ ok: false, raison: 'expire' });
  });

  it('refuse un code expiré', async () => {
    const tel = '+243971112255';
    await envoyerOtp(tel, 'CONNEXION', '1.1.1.3');
    const sms = await db.smsLog.findFirstOrThrow({ where: { telephone: tel } });
    await db.otpCode.updateMany({ where: { telephone: tel }, data: { expireLe: new Date(Date.now() - 1000) } });
    expect(await verifierOtp(tel, 'CONNEXION', /(\d{6})/.exec(sms.contenu)![1]!)).toEqual({ ok: false, raison: 'expire' });
  });
});

describe('sécurité', () => {
  it('jeton de rôles signé : valide, falsifié, expiré', async () => {
    const j = await signerRoles(['ADMIN'], Date.now() + 60_000, true, 'secret-a'.repeat(5));
    expect(await lireRoles(j, 'secret-a'.repeat(5))).toEqual({ roles: ['ADMIN'], deuxiemeEtape: true });
    expect(await lireRoles(j, 'autre-secret'.repeat(4))).toBeNull();
    const [charge, sig] = j.split('.');
    const falsifie = Buffer.from(JSON.stringify({ r: ['SUPERADMIN'], e: Date.now() + 60_000, d: 1 })).toString('base64url');
    expect(await lireRoles(`${falsifie}.${sig}`, 'secret-a'.repeat(5))).toBeNull();
    expect(charge).toBeTruthy();
    expect(await lireRoles(await signerRoles(['ADMIN'], Date.now() - 1, true, 's'.repeat(40)), 's'.repeat(40))).toBeNull();
  });

  it('rôles par zone', () => {
    expect(rolesPourChemin('/admin/parametres')).toEqual(['SUPERADMIN', 'ADMIN']);
    expect(rolesPourChemin('/admin/paiements/manuels')).toContain('AGENT');
    expect(rolesPourChemin('/admin/evenements')).not.toContain('AGENT');
  });

  it('chiffrement AES-GCM aller-retour, altération détectée', () => {
    const c = chiffrer('+243971234567');
    expect(c).not.toContain('971234567');
    expect(dechiffrer(c)).toBe('+243971234567');
    const b = Buffer.from(c, 'base64'); b[b.length - 1]! ^= 1;
    expect(() => dechiffrer(b.toString('base64'))).toThrow();
  });

  it('fuseaux : Kinshasa UTC+1, Lubumbashi UTC+2, aller-retour', () => {
    expect(localVersUtc('2026-11-14', '20:00', 'Africa/Kinshasa').toISOString()).toBe('2026-11-14T19:00:00.000Z');
    expect(localVersUtc('2026-11-14', '20:00', 'Africa/Lubumbashi').toISOString()).toBe('2026-11-14T18:00:00.000Z');
    expect(utcVersLocal(new Date('2026-11-14T18:00:00Z'), 'Africa/Lubumbashi')).toEqual({ jour: '2026-11-14', heure: '20:00' });
  });
});
