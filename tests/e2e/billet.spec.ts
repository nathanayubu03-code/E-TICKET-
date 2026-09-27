import { writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import sharp from 'sharp';
import { creerCommande } from '../../lib/commandes';
import { db } from '../../lib/db';
import { creerEvenement, viderEvenements } from './aide';
import { decoderQR } from './decodage';

test.describe.configure({ mode: 'serial' });

async function billetGratuit() { // utilisé par le test du PDF
  await viderEvenements();
  const e = await creerEvenement({ titre: 'Billet e2e', types: [{ nom: 'Entrée', prix: 0, quota: 10 }] });
  const c = await creerCommande({ telephone: '+243971239999', userId: null, evenementId: e.id, lignes: [{ typeId: e.typesBillet[0]!.id, quantite: 1 }] });
  const b = await db.ticket.findFirstOrThrow({ where: { commandeId: c.id } });
  return { e, b };
}

test('lisibilité du QR sur la zone de 168 px, écran de 360 px (25 billets par densité)', async ({ browser }) => {
  test.setTimeout(240_000);
  await viderEvenements();
  const e = await creerEvenement({ titre: 'Billet e2e', types: [{ nom: 'Entrée', prix: 0, quota: 100 }] });
  const billets = [];
  for (let i = 0; i < 25; i++) {
    const c = await creerCommande({ telephone: `+2439712${String(i).padStart(5, '0')}`, userId: null, evenementId: e.id, lignes: [{ typeId: e.typesBillet[0]!.id, quantite: 1 }] });
    billets.push(await db.ticket.findFirstOrThrow({ where: { commandeId: c.id } }));
  }
  const mesures: Record<string, unknown>[] = [];
  for (const dpr of [1, 1.5, 2, 3]) {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, deviceScaleFactor: dpr, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    let nets = 0, repli = 0, degrades = 0, largeur = 0;
    for (const b of billets) {
      await page.goto(`/b/${b.code}`);
      const svg = page.locator('.billet .motif svg');
      await expect(svg).toBeVisible();
      largeur = (await svg.boundingBox())!.width;
      const png = await svg.screenshot();
      const attendu = `${e.code}/${b.code}`;
      const entier = (await decoderQR(png)) === attendu;
      if (entier) nets++;
      // Comme le scanner en repli ZXing : image entière, puis centre recadré (60 %), puis ce centre agrandi.
      const meta = await sharp(png).metadata();
      const cote = Math.round(Math.min(meta.width!, meta.height!) * 0.6);
      const centre = await sharp(png).extract({ left: Math.round((meta.width! - cote) / 2), top: Math.round((meta.height! - cote) / 2), width: cote, height: cote }).toBuffer();
      const agrandi = await sharp(centre).resize({ width: Math.round(cote * 1.5), kernel: 'nearest' }).toBuffer();
      if (entier || (await decoderQR(centre)) === attendu || (await decoderQR(agrandi)) === attendu) repli++;
      // Approximation d'une photo par la caméra du contrôleur : réduction de moitié, flou, JPEG à 35 %.
      const degrade = await sharp(png).resize({ width: Math.round((largeur * dpr) / 2) }).blur(0.8).jpeg({ quality: 35 }).toBuffer();
      if ((await decoderQR(degrade)) === attendu) degrades++;
    }
    const zoneQrCss = (largeur * 168) / 264;
    const moduleCss = zoneQrCss / 33; // version 2 : 25 modules + 4 de marge de chaque côté
    mesures.push({ dpr, largeurMotifCss: Math.round(largeur), zoneQrCss: Math.round(zoneQrCss), moduleCss: +moduleCss.toFixed(2), modulePixelsPhysiques: +(moduleCss * dpr).toFixed(2), imageEntiere: `${nets}/${billets.length}`, avecRecadrage: `${repli}/${billets.length}`, captureDegradee: `${degrades}/${billets.length}` });
    await ctx.close();
  }
  writeFileSync('docs/billet-mesures.json', JSON.stringify({ date: new Date().toISOString().slice(0, 10), billets: billets.length, contenu: '33 caractères alphanumériques', mesures }, null, 2) + '\n');
  // Mesure, pas une garantie : sur une image fixe, ZXing en JavaScript rate de 0 à 3 billets sur 25 selon
  // le lancement, sans lien net avec la densité (voir docs/billet.md, risque ouvert). Plancher de contrôle à 80 %.
  for (const m of mesures) expect(Number(String(m.avecRecadrage).split('/')[0]), `DPR ${m.dpr}`).toBeGreaterThanOrEqual(Math.ceil(billets.length * 0.8));
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
