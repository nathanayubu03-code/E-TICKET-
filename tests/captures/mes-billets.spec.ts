import { test } from '@playwright/test';
import { creerCommande } from '../../lib/commandes';
import { creerEvenement, dernierCode, viderEvenements } from '../e2e/aide';

const DOSSIER = `docs/captures/etape-${process.env.ETAPE ?? '10'}`;
test.skip(!process.env.CAPTURES_MB, 'Lancer avec CAPTURES_MB=1');

test('mes billets vide et rempli', async ({ page }) => {
  test.setTimeout(120_000);
  await viderEvenements();
  for (const largeur of [360, 1280]) for (const theme of ['light', 'dark'] as const) {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    await page.goto('/mes-billets');
    await page.screenshot({ path: `${DOSSIER}/mes-billets-vide-${largeur}-${theme}.png`, fullPage: true });
  }
  const e1 = await creerEvenement({ titre: 'Événement test 1', types: [{ nom: 'Catégorie A', prix: 0, quota: 10 }] });
  const e2 = await creerEvenement({ titre: 'Événement test 2', cat: 'football', dansJours: 15, types: [{ nom: 'Tribune', prix: 0, quota: 10 }] });
  await creerCommande({ telephone: '+243971237777', userId: null, evenementId: e1.id, lignes: [{ typeId: e1.typesBillet[0]!.id, quantite: 1 }] });
  await creerCommande({ telephone: '+243971237777', userId: null, evenementId: e2.id, lignes: [{ typeId: e2.typesBillet[0]!.id, quantite: 1 }] });
  const depuis = new Date();
  await page.goto('/connexion?suite=/mes-billets');
  await page.getByRole('textbox', { name: 'Numéro' }).fill('971237777');
  await page.getByRole('button', { name: 'Recevoir le code' }).click();
  await page.getByLabel('Chiffre 1').fill(await dernierCode('+243971237777', depuis));
  await page.waitForURL((u) => u.pathname === '/mes-billets');
  for (const largeur of [360, 1280]) for (const theme of ['light', 'dark'] as const) {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    await page.goto('/mes-billets');
    await page.locator('.ligne-billet').first().waitFor();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${DOSSIER}/mes-billets-${largeur}-${theme}.png`, fullPage: true });
    await page.goto('http://localhost:3200/mes-billets.html');
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${DOSSIER}/mes-billets-${largeur}-${theme}-maquette.png`, fullPage: true });
  }
});
