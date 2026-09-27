import { expect, test } from '@playwright/test';
import { creerCommande } from '../../lib/commandes';
import { db } from '../../lib/db';
import { creerEvenement, dernierCode, viderEvenements } from './aide';

test.describe.configure({ mode: 'serial' });

test('Mes billets sans billet : message court et bouton vers les événements', async ({ page }) => {
  await page.goto('/mes-billets');
  await expect(page.getByRole('heading', { name: 'Aucun billet pour le moment' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Voir les événements' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Se connecter' }).first()).toBeVisible();
});

test('billets de l’acheteur, enregistrés sur le téléphone et toujours visibles sans session', async ({ page, context }) => {
  await viderEvenements();
  const e = await creerEvenement({ titre: 'Mes billets e2e', types: [{ nom: 'Entrée', prix: 0, quota: 10 }] });
  await creerCommande({ telephone: '+243971236666', userId: null, evenementId: e.id, lignes: [{ typeId: e.typesBillet[0]!.id, quantite: 2 }] });
  const depuis = new Date();
  await page.goto('/connexion?suite=/mes-billets');
  await page.getByRole('textbox', { name: 'Numéro' }).fill('971236666');
  await page.getByRole('button', { name: 'Recevoir le code' }).click();
  await page.getByLabel('Chiffre 1').fill(await dernierCode('+243971236666', depuis));
  await page.waitForURL((u) => u.pathname === '/mes-billets');
  await expect(page.getByRole('tab', { name: 'À venir (2)' })).toBeVisible();
  await expect(page.locator('.ligne-billet')).toHaveCount(2);
  await expect(page.locator('.ligne-billet').first().getByText('Sur ce téléphone')).toBeVisible();
  await page.locator('.ligne-billet').nth(1).click();
  await expect(page.locator('.ligne-billet').nth(1).getByText('Sur ce téléphone')).toBeVisible();
  await expect(page.getByRole('img', { name: /QR code du billet ET-/ })).toBeVisible();

  // Sans session (cookies effacés), les billets restent lisibles depuis le téléphone.
  await context.clearCookies();
  await page.reload();
  await expect(page.locator('.ligne-billet')).toHaveCount(2);
  await expect(page.getByRole('img', { name: /QR code du billet ET-/ })).toBeVisible();
  expect(await db.ticket.count({ where: { evenementId: e.id } })).toBe(2);
});
