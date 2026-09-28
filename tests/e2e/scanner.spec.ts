import { expect, test } from '@playwright/test';
import { creerCommande } from '../../lib/commandes';
import { db } from '../../lib/db';
import { connecterControleur, creerEvenement, viderEvenements } from './aide';

test.describe.configure({ mode: 'serial' });

async function scanner(page: import('@playwright/test').Page, texte: string) {
  await page.getByRole('button', { name: 'Saisir le n°' }).click();
  await page.getByLabel('Code du billet').fill(texte);
  await page.getByRole('button', { name: 'Vérifier' }).click();
}

test('scanner : valide, déjà scanné, QR modifié refusé, puis mode avion et synchronisation', async ({ page, context }) => {
  test.setTimeout(120_000);
  await viderEvenements();
  const e = await creerEvenement({ titre: 'Scan e2e', types: [{ nom: 'Entrée', prix: 0, quota: 20 }] });
  await creerCommande({ telephone: '+243971002002', userId: null, evenementId: e.id, lignes: [{ typeId: e.typesBillet[0]!.id, quantite: 4 }] });
  const billets = await db.ticket.findMany({ where: { evenementId: e.id }, orderBy: { publicId: 'asc' } });
  await connecterControleur(page, e.id);

  await expect(page.locator('.scan-barre')).toContainText('Scanner du contrôleur');
  await expect(page.getByText('En ligne · à jour')).toBeVisible();
  await expect(page.getByText('/ 20 entrées')).toBeVisible();

  // En ligne
  await scanner(page, `${e.code}/${billets[0]!.code}`);
  await expect(page.getByRole('heading', { name: 'Valide' })).toBeVisible();
  await expect(page.locator('.scan-valide')).toBeVisible();
  await page.getByRole('button', { name: 'Scanner le suivant' }).click();
  await scanner(page, `${e.code}/${billets[0]!.code}`);
  await expect(page.locator('.scan-deja')).toBeVisible();
  await expect(page.getByText(/Premier scan à \d\d:\d\d, Porte B\./)).toBeVisible();
  await page.getByRole('button', { name: 'Scanner le suivant' }).click();
  const code = billets[1]!.code;
  await scanner(page, `${e.code}/${(code[0] === 'A' ? 'B' : 'A') + code.slice(1)}`);
  await expect(page.locator('.scan-refuse')).toBeVisible();
  await page.getByRole('button', { name: 'Scanner le suivant' }).click();

  // Mode avion
  await context.setOffline(true);
  await scanner(page, `${e.code}/${billets[2]!.code}`);
  await expect(page.locator('.scan-valide')).toBeVisible();
  await page.getByRole('button', { name: 'Scanner le suivant' }).click();
  await expect(page.getByText('Hors ligne · 1 à envoyer')).toBeVisible();
  await scanner(page, billets[2]!.publicId);
  await expect(page.locator('.scan-deja')).toBeVisible();
  await page.getByRole('button', { name: 'Scanner le suivant' }).click();
  await scanner(page, `${e.code}/${(code[0] === 'A' ? 'B' : 'A') + code.slice(1)}`);
  await expect(page.getByRole('heading', { name: 'Inconnu, à vérifier' })).toBeVisible();
  await expect(page.getByText('Appelez un responsable')).toBeVisible();
  await page.getByRole('button', { name: 'Scanner le suivant' }).click();
  await scanner(page, `AUTRE1/${billets[3]!.code}`);
  await expect(page.locator('.scan-refuse')).toBeVisible();
  await page.getByRole('button', { name: 'Scanner le suivant' }).click();

  // Retour du réseau : synchronisation
  await context.setOffline(false);
  await expect(page.getByText('En ligne · à jour')).toBeVisible({ timeout: 15_000 });
  const t = await db.ticket.findUniqueOrThrow({ where: { id: billets[2]!.id } });
  expect(t.statut).toBe('UTILISE');
  expect(await db.scan.count({ where: { evenementId: e.id, horsLigne: true } })).toBe(4);
});

test('scanner : refuse de démarrer sans la liste des billets', async ({ page, context }) => {
  await viderEvenements();
  const e = await creerEvenement({ titre: 'Scan sans liste', types: [{ nom: 'Entrée', prix: 0, quota: 5 }] });
  await connecterControleur(page, e.id, '+243990000045');
  await page.evaluate(() => new Promise<void>((ok) => { const r = indexedDB.deleteDatabase('e-ticket-scanner'); r.onsuccess = () => ok(); r.onerror = () => ok(); r.onblocked = () => ok(); }));
  await context.setOffline(true);
  await page.reload().catch(() => undefined);
  await context.setOffline(false);
  await context.route('**/api/scan/*/manifeste', (r) => r.abort());
  await page.reload();
  await expect(page.getByText('Le scanner ne peut pas démarrer sans la liste des billets')).toBeVisible();
});
