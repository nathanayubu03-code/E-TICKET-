import { test } from '@playwright/test';
import { creerCommande } from '../../lib/commandes';
import { db } from '../../lib/db';
import { creerEvenement, viderEvenements } from '../e2e/aide';

const DOSSIER = `docs/captures/etape-${process.env.ETAPE ?? '09'}`;
test.skip(!process.env.CAPTURES_BILLET, 'Lancer avec CAPTURES_BILLET=1');

test('billet ouvert par lien SMS', async ({ page }) => {
  await viderEvenements();
  const e = await creerEvenement({ titre: 'Événement test 1', sousTitre: 'Sous-titre saisi par un administrateur', types: [{ nom: 'Catégorie A', prix: 0, quota: 10 }] });
  const c = await creerCommande({ telephone: '+243971235555', userId: null, evenementId: e.id, lignes: [{ typeId: e.typesBillet[0]!.id, quantite: 1 }] });
  const b = await db.ticket.findFirstOrThrow({ where: { commandeId: c.id } });
  for (const largeur of [360, 1280]) for (const theme of ['light', 'dark'] as const) {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    await page.goto(`/b/${b.code}`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${DOSSIER}/billet-${largeur}-${theme}.png`, fullPage: true });
    await page.goto('http://localhost:3200/mes-billets.html');
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${DOSSIER}/billet-${largeur}-${theme}-maquette.png`, fullPage: true });
  }
});
