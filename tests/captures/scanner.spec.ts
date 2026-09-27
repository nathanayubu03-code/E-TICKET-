import { test } from '@playwright/test';
import { creerCommande } from '../../lib/commandes';
import { db } from '../../lib/db';
import { connecterControleur, creerEvenement, viderEvenements } from '../e2e/aide';

const DOSSIER = `docs/captures/etape-${process.env.ETAPE ?? '11'}`;
test.skip(!process.env.CAPTURES_SCAN, 'Lancer avec CAPTURES_SCAN=1');

test('écrans du scanner', async ({ page, context }) => {
  test.setTimeout(120_000);
  await viderEvenements();
  const e = await creerEvenement({ titre: 'Événement test 1', types: [{ nom: 'Catégorie A', prix: 0, quota: 20 }] });
  await creerCommande({ telephone: '+243971003003', userId: null, evenementId: e.id, lignes: [{ typeId: e.typesBillet[0]!.id, quantite: 3 }] });
  const b = await db.ticket.findMany({ where: { evenementId: e.id } });
  await connecterControleur(page, e.id, '+243990000046');
  for (const largeur of [360, 1280]) for (const theme of ['light', 'dark'] as const) {
    await page.setViewportSize({ width: largeur, height: 800 });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    await page.goto(`/scan/${e.id}`);
    await page.locator('.scan-barre').waitFor();
    await page.screenshot({ path: `${DOSSIER}/scanner-pret-${largeur}-${theme}.png` });
  }
  await page.setViewportSize({ width: 360, height: 800 });
  const etats: [string, string][] = [['valide', `${e.code}/${b[0]!.code}`], ['deja', `${e.code}/${b[0]!.code}`], ['refuse', `AUTRE1/${b[1]!.code}`]];
  for (const [nom, texte] of etats) {
    await page.getByRole('button', { name: 'Saisir le n°' }).click();
    await page.getByLabel('Code du billet').fill(texte);
    await page.getByRole('button', { name: 'Vérifier' }).click();
    await page.locator('.scan-resultat').waitFor();
    await page.screenshot({ path: `${DOSSIER}/scanner-${nom}-360.png` });
    await page.getByRole('button', { name: 'Scanner le suivant' }).click();
  }
  await context.setOffline(true);
  const c = b[2]!.code;
  await page.getByRole('button', { name: 'Saisir le n°' }).click();
  await page.getByLabel('Code du billet').fill(`${e.code}/${(c[0] === 'A' ? 'B' : 'A') + c.slice(1)}`);
  await page.getByRole('button', { name: 'Vérifier' }).click();
  await page.locator('.scan-resultat').waitFor();
  await page.screenshot({ path: `${DOSSIER}/scanner-inconnu-hors-ligne-360.png` });
  await context.setOffline(false);
});
