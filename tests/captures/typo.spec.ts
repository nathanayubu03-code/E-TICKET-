import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { creerEvenement, viderEvenements } from '../e2e/aide';

// Captures des trois polices de titre (page /test-typo), colonne de 360 px, clair et sombre.
const DOSSIER = 'docs/captures/typo';
test.skip(!process.env.CAPTURES_TYPO, 'Lancer avec CAPTURES_TYPO=1');

test('trois options de police, 360 px', async ({ page }) => {
  test.setTimeout(120_000);
  mkdirSync(DOSSIER, { recursive: true });
  await viderEvenements();
  await creerEvenement({ titre: 'Événement test 1', types: [{ nom: 'Standard', prix: 10000, quota: 100 }, { nom: 'VIP', prix: 25000, quota: 20 }] });
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    await page.goto('/test-typo');
    await page.evaluate(() => document.fonts.ready);
    for (const n of [1, 2, 3]) {
      const col = page.getByTestId(`option-${n}`);
      await expect(col).toBeVisible();
      await col.screenshot({ path: `${DOSSIER}/option-${n}-360-${theme}.png` });
    }
  }
  // L'accueil réel, avec l'option active.
  await page.setViewportSize({ width: 360, height: 800 });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${DOSSIER}/accueil-option-active-360.png`, fullPage: true });
});
