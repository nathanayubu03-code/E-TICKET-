import { test } from '@playwright/test';
import { creerCommande } from '../../lib/commandes';
import { db } from '../../lib/db';
import { payerCommande } from '../../lib/paiement/confirmation';
import { connecterAdmin, creerEvenement, viderEvenements } from '../e2e/aide';

const DOSSIER = `docs/captures/etape-${process.env.ETAPE ?? '13'}`;
test.skip(!process.env.CAPTURES_ADMIN, 'Lancer avec CAPTURES_ADMIN=1');

async function capturer(page: import('@playwright/test').Page, url: string, nom: string) {
  for (const largeur of [360, 1280]) for (const theme of ['light', 'dark'] as const) {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    await page.goto(url);
    await page.screenshot({ path: `${DOSSIER}/${nom}-${largeur}-${theme}.png`, fullPage: true });
  }
}

test('administration : tableau de bord vide et rempli, commandes, reversements, paramètres', async ({ page }) => {
  test.setTimeout(180_000);
  await viderEvenements();
  await connecterAdmin(page);
  await capturer(page, '/admin', 'tableau-de-bord-vide');
  const orga = await db.organizer.create({ data: { nom: 'Organisateur test', slug: 'orga-capture', reversementOperateur: 'MPESA', reversementNumeroFin: '000' } });
  const e = await creerEvenement({ titre: 'Événement test 1', types: [{ nom: 'Catégorie A', prix: 50000, quota: 100 }, { nom: 'Catégorie B', prix: 15000, quota: 300 }] });
  await db.event.update({ where: { id: e.id }, data: { organisateurId: orga.id } });
  for (const [i, [op, t, q]] of ([['MPESA', 0, 2], ['AIRTEL', 1, 3], ['ORANGE', 1, 1], ['AFRIMONEY', 0, 1]] as const).entries()) {
    const tel = `+2439710100${i}${i}`;
    const c = await creerCommande({ telephone: tel, userId: null, evenementId: e.id, lignes: [{ typeId: e.typesBillet[t]!.id, quantite: q }] });
    await db.payment.create({ data: { commandeId: c.id, fournisseur: 'capture', operateur: op, telephone: tel, montant: c.total, cleIdempotence: `${c.id}:0`, statut: 'REUSSI' } });
    await payerCommande(c.id, 'MOBILE_MONEY');
  }
  await capturer(page, '/admin', 'tableau-de-bord');
  await capturer(page, '/admin/commandes?q=%2B243971010000', 'commandes');
  await capturer(page, '/admin/reversements', 'reversements');
  await capturer(page, '/admin/parametres', 'parametres');
});
