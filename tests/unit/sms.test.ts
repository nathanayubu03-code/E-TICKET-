import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { envoyerOtp, verifierOtp } from '@/lib/auth/otp';
import { viderCacheEnv } from '@/lib/env';
import { db } from '@/lib/db';
import { envoyerSms, remplacerFournisseurSms } from '@/lib/sms';
import { alerterNouvelEvenement, prevenirListeAttente } from '@/lib/sms/diffusion';
import { referentiel, viderBase } from './aide-db';

describe('SMS', () => {
  beforeEach(async () => { await viderBase(); await referentiel(); remplacerFournisseurSms(null); });
  afterAll(async () => { await db.$disconnect(); });

  it('journalise chaque envoi ; un échec du fournisseur est journalisé sans lever d’erreur', async () => {
    expect(await envoyerSms('+243971000001', 'test', 'Bonjour')).toBe(true);
    remplacerFournisseurSms({ nom: 'panne', envoyer: async () => { throw new Error('réseau opérateur'); } });
    expect(await envoyerSms('+243971000002', 'test', 'Bonjour')).toBe(false);
    const logs = await db.smsLog.findMany({ orderBy: { creeLe: 'asc' } });
    expect(logs.map((l) => l.statut)).toEqual(['ENVOYE', 'ECHOUE']);
    expect(logs[1]!.erreur).toBe('réseau opérateur');
  });

  it('les codes OTP ne sont pas journalisés en clair hors simulation', async () => {
    remplacerFournisseurSms({ nom: 'reel', envoyer: async () => ({ reference: 'r1' }) });
    await envoyerSms('+243971000003', 'otp', 'Votre code est 123456', { masquer: true });
    expect((await db.smsLog.findFirstOrThrow()).contenu).toBe('[masqué]');
  });

  it('alerte de publication : abonnés de la ville et de toutes les villes, un SMS par numéro, pas les désinscrits', async () => {
    const admin = await db.user.create({ data: { telephone: '+243990000009', roles: ['ADMIN'] } });
    const goma = await db.city.findUniqueOrThrow({ where: { nom: 'Goma' } });
    const kin = await db.city.findUniqueOrThrow({ where: { nom: 'Kinshasa' } });
    const e = await db.event.create({ data: { code: 'SMSEV1', slug: 'sms-ev', titre: 'Festival', statut: 'PUBLIE', selAffichage: 's', creeParId: admin.id, villeId: goma.id, debutLe: new Date(Date.now() + 86400_000) } });
    const abo = (telephone: string, villeId: string | null, desinscrit = false) => db.smsAlertSubscription.create({ data: { telephone, villeId, consentementLe: new Date(), texteConsentement: 'x', desinscritLe: desinscrit ? new Date() : null } });
    await abo('+243971000010', goma.id);
    await abo('+243971000010', null);
    await abo('+243971000011', null);
    await abo('+243971000012', kin.id);
    await abo('+243971000013', goma.id, true);
    expect(await alerterNouvelEvenement(e.id)).toBe(2);
    expect((await db.smsLog.findMany({ where: { gabarit: 'alerte_evenement' } })).map((s) => s.telephone).sort()).toEqual(['+243971000010', '+243971000011']);
  });

  it('liste d’attente : chaque inscrit est prévenu une seule fois', async () => {
    const admin = await db.user.create({ data: { telephone: '+243990000009', roles: ['ADMIN'] } });
    const e = await db.event.create({ data: { code: 'SMSEV2', slug: 'sms-ev2', titre: 'Concert', statut: 'COMPLET', selAffichage: 's', creeParId: admin.id } });
    await db.waitlistEntry.createMany({ data: [{ evenementId: e.id, telephone: '+243971000020', consentementLe: new Date() }, { evenementId: e.id, telephone: '+243971000021', consentementLe: new Date() }] });
    expect(await prevenirListeAttente(e.id, admin)).toBe(2);
    expect(await prevenirListeAttente(e.id, admin)).toBe(0);
  });
});

describe('code OTP affiché en version de test', () => {
  beforeEach(async () => { await viderBase(); remplacerFournisseurSms(null); });
  afterEach(() => { process.env.APP_ENV = 'development'; viderCacheEnv(); });
  afterAll(async () => { await db.$disconnect(); });

  it('staging renvoie le code à afficher, et ce code est le bon', async () => {
    process.env.APP_ENV = 'staging'; viderCacheEnv();
    const r = await envoyerOtp('+243971000030', 'CONNEXION', '10.0.0.1');
    expect(r.ok).toBe(true);
    const code = (r as { codeTest?: string }).codeTest;
    expect(code).toMatch(/^\d{6}$/);
    expect((await verifierOtp('+243971000030', 'CONNEXION', code!)).ok).toBe(true);
  });

  it('development et production ne renvoient jamais le code', async () => {
    for (const [i, app] of (['development', 'production'] as const).entries()) {
      process.env.APP_ENV = app; viderCacheEnv();
      const r = await envoyerOtp(`+24397100004${i}`, 'CONNEXION', '10.0.0.2');
      expect(r.ok).toBe(true);
      expect(r).not.toHaveProperty('codeTest');
    }
  });
});
