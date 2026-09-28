import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { db } from '../../lib/db';
import { creerEvenement, dernierCode, viderEvenements } from '../e2e/aide';

// Captures des modifications devise et langue : accueil, page événement, choix de la devise,
// choix de l'opérateur et écran d'attente, en 360 et 1280 px, en français et en anglais, en CDF et en USD.
const DOSSIER = 'docs/captures/modifs-devise-langue';
test.describe.configure({ mode: 'serial' });
test.skip(!process.env.CAPTURES_DEVISES, 'Lancer avec CAPTURES_DEVISES=1');

let slug = '';
test.beforeAll(async () => {
  mkdirSync(DOSSIER, { recursive: true });
  await viderEvenements();
  const e = await creerEvenement({
    titre: 'Événement test devises', sousTitre: 'Sous-titre saisi par l’administrateur', description: 'Description saisie par l’administrateur.',
    types: [{ nom: 'Standard', prix: 25000, prixUsd: 1000, quota: 200 }, { nom: 'VIP', prix: 75000, prixUsd: 3000, quota: 50 }],
  });
  await db.event.update({ where: { id: e.id }, data: { titreEn: 'Currency test event', descriptionEn: 'Description entered by the administrator.' } });
  slug = e.slug;
});

let n = 0;
// Aucun défilement horizontal, à aucune largeur.
async function sansDebordement(page: import('@playwright/test').Page, largeur: number, ou: string) {
  const l = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(l, `${ou} : débordement horizontal`).toBe(largeur);
}
for (const langue of ['fr', 'en'] as const) {
  for (const largeur of [360, 1280] as const) {
    test(`accueil et événement ${langue} ${largeur}`, async ({ page, context }) => {
      await context.addCookies([{ name: 'NEXT_LOCALE', value: langue, url: 'http://localhost:3100' }]);
      await page.setViewportSize({ width: largeur, height: largeur === 360 ? 800 : 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      await sansDebordement(page, largeur, 'accueil');
      await page.screenshot({ path: `${DOSSIER}/accueil-${langue}-${largeur}.png`, fullPage: true });
      await page.goto(`/evenements/${slug}`);
      await page.evaluate(() => document.fonts.ready);
      await sansDebordement(page, largeur, 'événement');
      await page.screenshot({ path: `${DOSSIER}/evenement-${langue}-${largeur}.png`, fullPage: true });
    });

    for (const devise of ['CDF', 'USD'] as const) {
      test(`paiement et attente ${langue} ${largeur} ${devise}`, async ({ page, context }) => {
        test.setTimeout(120_000);
        await db.rateLimit.deleteMany({});
        await context.addCookies([{ name: 'NEXT_LOCALE', value: langue, url: 'http://localhost:3100' }]);
        await page.setViewportSize({ width: largeur, height: largeur === 360 ? 800 : 900 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        // Numéro qui finit par 9999 : la simulation ne répond pas, l'écran d'attente reste affiché.
        const tel = `97${String(100 + n++).padStart(3, '0')}9999`;
        await page.goto(`/evenements/${slug}`);
        await page.locator('.categorie-billet').first().locator('button.plus').click();
        await page.locator('.panier a.btn-plein').click();
        await page.waitForLoadState('networkidle');
        const depuis = new Date();
        const bouton = page.getByRole('button', { name: langue === 'fr' ? 'Recevoir le code' : 'Get the code' });
        // Si la page n'était pas encore interactive, le champ ne réagit pas : on le remplit de nouveau.
        await expect(async () => {
          await page.getByRole('textbox', { name: langue === 'fr' ? 'Numéro' : 'Phone number' }).fill(tel);
          await expect(bouton).toBeEnabled({ timeout: 1000 });
        }).toPass({ timeout: 20_000 });
        await bouton.click();
        await page.getByLabel(langue === 'fr' ? 'Chiffre 1' : 'Digit 1').fill(await dernierCode('+243' + tel, depuis));
        await page.waitForURL(/\/achat\/ET-/);
        if (devise === 'USD') await page.locator('.choix-devise .devise').nth(1).click();
        await page.evaluate(() => document.fonts.ready);
        await page.locator('.choix-devise').screenshot({ path: `${DOSSIER}/choix-devise-${langue}-${largeur}-${devise}.png` });
        await page.locator('.operateurs').screenshot({ path: `${DOSSIER}/choix-operateur-${langue}-${largeur}-${devise}.png` });
        await sansDebordement(page, largeur, 'paiement');
        await page.screenshot({ path: `${DOSSIER}/paiement-${langue}-${largeur}-${devise}.png`, fullPage: true });
        await page.locator('section button.btn-principal.btn-grand').first().click();
        await page.locator('.minuteur').waitFor();
        await sansDebordement(page, largeur, 'attente');
        await page.screenshot({ path: `${DOSSIER}/attente-${langue}-${largeur}-${devise}.png`, fullPage: true });
      });
    }
  }
}
