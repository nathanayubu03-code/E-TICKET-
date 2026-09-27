import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { empreinteCode } from '@/lib/billets/generation';
import { creerCommande } from '@/lib/commandes';
import { db } from '@/lib/db';
import { appareil, manifeste, synchroniser, verifierEnLigne } from '@/lib/scan';
import { referentiel, viderBase } from './aide-db';

async function contexte() {
  const admin = await db.user.upsert({ where: { telephone: '+243990000009' }, update: {}, create: { telephone: '+243990000009', roles: ['ADMIN'] } });
  const ctrl = await db.user.create({ data: { telephone: '+243990000055', roles: ['CONTROLEUR'] } });
  const e = await db.event.create({ data: { code: 'SCANEV', slug: 'scan-' + Math.random().toString(36).slice(2), titre: 'Scan', statut: 'PUBLIE', selAffichage: 's', creeParId: admin.id, debutLe: new Date(Date.now() + 3600_000), typesBillet: { create: { nom: 'Std', prixCdf: 0, quota: 10, restant: 10 } } }, include: { typesBillet: true } });
  await creerCommande({ telephone: '+243971001001', userId: null, evenementId: e.id, lignes: [{ typeId: e.typesBillet[0]!.id, quantite: 3 }] });
  const billets = await db.ticket.findMany({ where: { evenementId: e.id } });
  const a1 = await appareil(ctrl.id, e.id, null, 'A1');
  const a2 = await appareil(ctrl.id, e.id, null, 'A2');
  return { e, ctrl, billets, a1, a2 };
}
const base = (x: { e: { id: string }; ctrl: { id: string }; a1: { id: string } }, id: string) => ({ scanClientId: id, evenementId: x.e.id, appareilId: x.a1.id, controleurId: x.ctrl.id, porte: 'A', scanneLe: new Date(), horsLigne: false });

describe('scanner', () => {
  beforeEach(async () => { await viderBase(); await referentiel(); });
  afterAll(async () => { await db.$disconnect(); });

  it('manifeste : empreintes SHA-256 des billets, jamais les codes', async () => {
    const { e, billets } = await contexte();
    const m = (await manifeste(e.id))!;
    expect(m.billets).toHaveLength(3);
    expect(m.billets.map((b) => b[0]).sort()).toEqual(billets.map((b) => empreinteCode(b.code)).sort());
    expect(JSON.stringify(m)).not.toContain(billets[0]!.code);
  });

  it('en ligne : valide une fois, puis déjà scanné avec l’heure et la porte du premier scan', async () => {
    const x = await contexte();
    const b = x.billets[0]!;
    const c = { evenement: 'SCANEV', code: b.code };
    expect((await verifierEnLigne({ ...base(x, 's1'), contenu: c, brut: `SCANEV/${b.code}` })).resultat).toBe('VALIDE');
    const r = await verifierEnLigne({ ...base(x, 's2'), contenu: c, brut: `SCANEV/${b.code}` });
    expect(r).toMatchObject({ resultat: 'DEJA_SCANNE', porte: 'A' });
    expect(r.premierScanLe).toBeTruthy();
    // Même identifiant de scan renvoyé : réponse identique, pas de nouveau scan.
    expect((await verifierEnLigne({ ...base(x, 's1'), contenu: c, brut: '' })).resultat).toBe('VALIDE');
    expect(await db.scan.count()).toBe(2);
  });

  it('deux contrôleurs au même instant : un seul « Valide »', async () => {
    const x = await contexte();
    const b = x.billets[1]!;
    const r = await Promise.all([1, 2, 3, 4].map((i) => verifierEnLigne({ ...base(x, `c${i}`), contenu: { evenement: 'SCANEV', code: b.code }, brut: '' })));
    expect(r.filter((y) => y.resultat === 'VALIDE')).toHaveLength(1);
    expect(r.filter((y) => y.resultat === 'DEJA_SCANNE')).toHaveLength(3);
  });

  it('QR modifié ou d’un autre événement : refusé', async () => {
    const x = await contexte();
    const code = x.billets[0]!.code;
    const modifie = (code[0] === 'A' ? 'B' : 'A') + code.slice(1);
    expect((await verifierEnLigne({ ...base(x, 'm1'), contenu: { evenement: 'SCANEV', code: modifie }, brut: '' })).resultat).toBe('REFUSE');
    expect((await verifierEnLigne({ ...base(x, 'm2'), contenu: { evenement: 'AUTRE1', code }, brut: '' })).resultat).toBe('REFUSE');
    expect((await verifierEnLigne({ ...base(x, 'm3'), contenu: null, brut: 'n importe quoi' })).resultat).toBe('REFUSE');
  });

  it('saisie manuelle du numéro lisible', async () => {
    const x = await contexte();
    expect((await verifierEnLigne({ ...base(x, 'n1'), contenu: null, publicId: x.billets[2]!.publicId, brut: x.billets[2]!.publicId })).resultat).toBe('VALIDE');
  });

  it('hors ligne sur deux appareils : le premier scan est gardé, le second signalé ; synchronisation idempotente', async () => {
    const x = await contexte();
    const b = x.billets[0]!;
    const emp = empreinteCode(b.code);
    const t0 = new Date(Date.now() - 60_000).toISOString();
    const t1 = new Date(Date.now() - 30_000).toISOString();
    // L'appareil 2 synchronise d'abord son scan (plus tardif), puis l'appareil 1 le sien (plus ancien).
    expect(await synchroniser({ evenementId: x.e.id, appareilId: x.a2.id, controleurId: x.ctrl.id, scans: [{ scanClientId: 'h2', empreinte: emp, brut: '', resultatLocal: 'VALIDE', scanneLe: t1, porte: 'B' }] })).toEqual({ recus: 1, conflits: 0 });
    expect(await synchroniser({ evenementId: x.e.id, appareilId: x.a1.id, controleurId: x.ctrl.id, scans: [{ scanClientId: 'h1', empreinte: emp, brut: '', resultatLocal: 'VALIDE', scanneLe: t0, porte: 'A' }] })).toEqual({ recus: 1, conflits: 1 });
    const t = await db.ticket.findUniqueOrThrow({ where: { id: b.id } });
    expect(t.premierScanLe?.toISOString()).toBe(t0);
    expect(t.premierePorte).toBe('A');
    expect(await db.scan.count({ where: { billetId: b.id, conflit: true } })).toBe(1);
    // Renvoi du même lot : rien de nouveau.
    expect(await synchroniser({ evenementId: x.e.id, appareilId: x.a1.id, controleurId: x.ctrl.id, scans: [{ scanClientId: 'h1', empreinte: emp, brut: '', resultatLocal: 'VALIDE', scanneLe: t0, porte: 'A' }] })).toEqual({ recus: 0, conflits: 0 });
  });
});
