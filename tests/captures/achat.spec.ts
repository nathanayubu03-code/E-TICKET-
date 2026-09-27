import { test } from '@playwright/test';
import { creerEvenement, dernierCode, viderEvenements } from '../e2e/aide';

// Captures du parcours d'achat (étapes 2 à 4 de achat.html), face à la maquette.
const ETAPE = process.env.ETAPE ?? '08';
const DOSSIER = `docs/captures/etape-${ETAPE}`;
test.describe.configure({ mode: 'serial' });
test.skip(!process.env.CAPTURES_ACHAT, 'Lancer avec CAPTURES_ACHAT=1');

for (const largeur of [360, 1280] as const) {
  for (const theme of ['light', 'dark'] as const) {
    test(`achat ${largeur} ${theme}`, async ({ page }) => {
      test.setTimeout(120_000);
      await viderEvenements();
      const e = await creerEvenement({ titre: 'Événement test 1', types: [{ nom: 'Standard', prix: 50000, quota: 10 }] });
      await page.setViewportSize({ width: largeur, height: largeur === 360 ? 800 : 900 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      const tel = `97123${largeur}${theme === 'light' ? 1 : 2}`.slice(0, 9);
      await page.goto(`/evenements/${e.slug}`);
      await page.getByRole('button', { name: 'Ajouter un billet Standard' }).click();
      await page.getByRole('link', { name: 'Continuer' }).click();
      const depuis = new Date();
      await page.getByRole('textbox', { name: 'Numéro' }).fill(tel);
      await page.getByRole('button', { name: 'Recevoir le code' }).click();
      await page.screenshot({ path: `${DOSSIER}/achat-code-${largeur}-${theme}.png`, fullPage: true });
      await page.getByLabel('Chiffre 1').fill(await dernierCode('+243' + tel, depuis));
      await page.waitForURL(/\/achat\/ET-/);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `${DOSSIER}/achat-paiement-${largeur}-${theme}.png`, fullPage: true });
      await page.getByRole('button', { name: /^Payer / }).click();
      await page.getByRole('heading', { name: 'Validez sur votre téléphone' }).waitFor();
      await page.screenshot({ path: `${DOSSIER}/achat-attente-${largeur}-${theme}.png`, fullPage: true });
      await page.getByRole('heading', { name: "C'est bon ! Vos billets sont prêts." }).waitFor({ timeout: 30_000 });
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${DOSSIER}/achat-confirmation-${largeur}-${theme}.png`, fullPage: true });
      await page.goto('http://localhost:3200/achat.html');
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `${DOSSIER}/achat-${largeur}-${theme}-maquette.png`, fullPage: true });
    });
  }
}
