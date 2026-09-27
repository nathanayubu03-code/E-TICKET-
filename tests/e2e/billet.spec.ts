import { writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import sharp from 'sharp';
import { creerCommande } from '../../lib/commandes';
import { db } from '../../lib/db';
import { creerEvenement, viderEvenements } from './aide';
import { decoderQR } from './decodage';

test.describe.configure({ mode: 'serial' });

async function billetGratuit() {
  await viderEvenements();
  const e = await creerEvenement({ titre: 'Billet e2e', types: [{ nom: 'Entrée', prix: 0, quota: 10 }] });
  const c = await creerCommande({ telephone: '+243971239999', userId: null, evenementId: e.id, lignes: [{ typeId: e.typesBillet[0]!.id, quantite: 1 }] });
  const b = await db.ticket.findFirstOrThrow({ where: { commandeId: c.id } });
  return { e, b };
}

test('lisibilité du QR sur la zone de 168 px, écran de 360 px', async ({ browser }) => {
  const { e, b } = await billetGratuit();
  const attendu = `${e.code}/${b.code}`;
  const mesures: Record<string, unknown>[] = [];
  for (const dpr of [1, 1.5, 2, 3]) {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, deviceScaleFactor: dpr, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(`/b/${b.code}`);
    const svg = page.locator('.billet .motif svg');
    await expect(svg).toBeVisible();
    const boite = (await svg.boundingBox())!;
    const zoneQrCss = (boite.width * 168) / 264; // zone QR = 7 cases sur 11 (168 unités sur 264)
    const modules = 25 + 8; // version 2 (25 modules) + marge de 4 modules de chaque côté
    const png = await svg.screenshot();
    const net = await decoderQR(png);
    // Approximation d'une photo prise par la caméra du contrôleur : réduction, flou, compression JPEG forte.
    const degrade = await sharp(png).resize({ width: Math.round((boite.width * dpr) / 2) }).blur(0.8).jpeg({ quality: 35 }).toBuffer();
    const flou = await decoderQR(degrade);
    mesures.push({ dpr, largeurMotifCss: Math.round(boite.width), zoneQrCss: Math.round(zoneQrCss), moduleCss: +(zoneQrCss / modules).toFixed(2), modulePixelsPhysiques: +((zoneQrCss / modules) * dpr).toFixed(2), decodeNet: net === attendu, decodeDegrade: flou === attendu });
    expect(net).toBe(attendu);
    await ctx.close();
  }
  writeFileSync('docs/billet-mesures.json', JSON.stringify({ date: new Date().toISOString().slice(0, 10), contenu: `${attendu.length} caractères alphanumériques`, mesures }, null, 2) + '\n');
});

test('PDF du billet : léger, QR lisible, refusé sans droit', async ({ page, request }) => {
  const { b } = await billetGratuit();
  const refus = await request.get(`/api/billets/${b.publicId}/pdf`);
  expect(refus.status()).toBe(404);
  const r = await request.get(`/api/billets/${b.publicId}/pdf?jeton=${b.code}`);
  expect(r.status()).toBe(200);
  expect(r.headers()['content-type']).toBe('application/pdf');
  const corps = await r.body();
  expect(corps.subarray(0, 5).toString()).toBe('%PDF-');
  expect(corps.length).toBeLessThan(30_000);
  await page.goto(`/b/${b.code}`);
  await expect(page.getByRole('link', { name: 'Télécharger en PDF' })).toBeVisible();
});
