import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '@/lib/db';
import { lireEnv, verifierDemarrage } from '@/lib/env';
import { operateurDuNumero } from '@/lib/operateurs';
import { formaterChiffres, masquerTelephone, normaliserTelephone } from '@/lib/telephone';
import { fusionner } from '@/i18n/fusion';
import { verifierSeedDemoAutorise } from '@/prisma/garde-demo';
import { referentiel, viderBase } from './aide-db';

const base = { DATABASE_URL: 'postgresql://x@localhost/db', SESSION_SECRET: 'x'.repeat(32), ENCRYPTION_KEY: Buffer.alloc(32).toString('base64'), CRON_SECRET: 'y'.repeat(24) };

describe('téléphone', () => {
  it('normalise au format +243XXXXXXXXX', () => {
    for (const s of ['0971234567', '971234567', '+243971234567', '243 97 123 45 67', '00243971234567']) expect(normaliserTelephone(s)).toBe('+243971234567');
  });
  it('refuse les numéros invalides', () => {
    for (const s of ['', '12345', '097123456', '+33612345678', '0071234567']) expect(normaliserTelephone(s)).toBeNull();
  });
  it('formate et masque', () => {
    expect(formaterChiffres('971234567')).toBe('97 123 45 67');
    expect(masquerTelephone('+243971234567')).toBe('+243 97 *** ** 67');
  });
});

describe('opérateurs', () => {
  it('détecte par préfixe', () => {
    expect(operateurDuNumero('971234567')?.k).toBe('AIRTEL');
    expect(operateurDuNumero('+243811234567')?.k).toBe('MPESA');
    expect(operateurDuNumero('0851234567')?.k).toBe('ORANGE');
    expect(operateurDuNumero('901234567')?.k).toBe('AFRIMONEY');
    expect(operateurDuNumero('911234567')?.k).toBe('AFRIMONEY');
    expect(operateurDuNumero('121234567')).toBeNull();
  });
});

describe('démarrage', () => {
  it('refuse la simulation de paiement en production', () => {
    expect(() => verifierDemarrage(lireEnv({ ...base, NODE_ENV: 'production', PAYMENT_PROVIDER: 'simulation' }))).toThrow(/PAYMENT_PROVIDER=simulation/);
  });
  it('refuse la simulation SMS en production', () => {
    expect(() => verifierDemarrage(lireEnv({ ...base, NODE_ENV: 'production', SMS_PROVIDER: 'simulation' }))).toThrow(/SMS_PROVIDER=simulation/);
  });
  it('refuse aussi quand APP_ENV vaut production', () => {
    expect(() => verifierDemarrage(lireEnv({ ...base, NODE_ENV: 'development', APP_ENV: 'production', PAYMENT_PROVIDER: 'simulation' }))).toThrow();
  });
  it('accepte la simulation en développement', () => {
    expect(() => verifierDemarrage(lireEnv({ ...base, NODE_ENV: 'development', PAYMENT_PROVIDER: 'simulation', SMS_PROVIDER: 'simulation' }))).not.toThrow();
  });
  it('refuse une configuration sans secret', () => {
    expect(() => lireEnv({ DATABASE_URL: 'x' })).toThrow(/Configuration invalide/);
  });
});

describe('seed de démonstration', () => {
  it('refuse en production et sur une base distante', () => {
    expect(() => verifierSeedDemoAutorise({ NODE_ENV: 'production', DATABASE_URL: 'postgresql://u@localhost/db' })).toThrow();
    expect(() => verifierSeedDemoAutorise({ APP_ENV: 'production', DATABASE_URL: 'postgresql://u@localhost/db' })).toThrow();
    expect(() => verifierSeedDemoAutorise({ DATABASE_URL: 'postgresql://u:p@ep-x.eu-central-1.aws.neon.tech/db' })).toThrow(/pas une base locale/);
    expect(() => verifierSeedDemoAutorise({ DATABASE_URL: 'postgresql://u:p@localhost:5432/db' })).not.toThrow();
  });
});

describe('traductions', () => {
  it('retombe sur le français pour les clés absentes ou vides', () => {
    const fr = { a: { b: 'Bonjour', c: 'Merci' }, d: 'Oui' };
    expect(fusionner(fr, { a: { b: 'Mbote', c: '' } })).toEqual({ a: { b: 'Mbote', c: 'Merci' }, d: 'Oui' });
  });
});

describe('base de données', () => {
  beforeAll(async () => { await viderBase(); await referentiel(); });
  afterAll(async () => { await db.$disconnect(); });

  it('le journal d’audit refuse modification et suppression', async () => {
    const ligne = await db.auditLog.create({ data: { action: 'test', entite: 'Test' } });
    await expect(db.auditLog.update({ where: { id: ligne.id }, data: { action: 'autre' } })).rejects.toThrow();
    await expect(db.auditLog.delete({ where: { id: ligne.id } })).rejects.toThrow();
  });

  it('le stock restant ne peut pas devenir négatif', async () => {
    const admin = await db.user.create({ data: { telephone: '+243990000002', roles: ['ADMIN'] } });
    const evt = await db.event.create({ data: { code: 'TSTOCK', slug: 'test-stock', titre: 'Test', selAffichage: 'x', creeParId: admin.id, typesBillet: { create: { nom: 'A', prixCdf: 1000, quota: 2, restant: 2 } } }, include: { typesBillet: true } });
    const tt = evt.typesBillet[0]!;
    await expect(db.ticketType.update({ where: { id: tt.id }, data: { restant: -1 } })).rejects.toThrow();
  });

  it('le référentiel contient les catégories et les villes avec leur fuseau', async () => {
    expect(await db.category.count()).toBe(5);
    expect((await db.city.findUnique({ where: { nom: 'Goma' } }))?.fuseau).toBe('Africa/Lubumbashi');
    expect((await db.city.findUnique({ where: { nom: 'Kinshasa' } }))?.fuseau).toBe('Africa/Kinshasa');
  });
});

describe('origine des requêtes', () => {
  it('accepte le même hôte, refuse une autre origine', async () => {
    const { memeOrigine } = await import('@/lib/requete');
    const req = (h: Record<string, string>) => new Request('https://e-ticket.example/api/x', { method: 'POST', headers: h });
    expect(memeOrigine(req({ origin: 'https://e-ticket.example', host: 'e-ticket.example' }))).toBe(true);
    expect(memeOrigine(req({ origin: 'https://autre.example', host: 'e-ticket.example' }))).toBe(false);
    expect(memeOrigine(req({ host: 'e-ticket.example', 'sec-fetch-site': 'cross-site' }))).toBe(false);
  });
});
