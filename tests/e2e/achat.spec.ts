import { expect, test } from '@playwright/test';
import { db } from '../../lib/db';
import { creerEvenement, dernierCode, viderEvenements } from './aide';

test.describe.configure({ mode: 'serial' });

test('réservation : choix des billets, connexion par code, commande en attente et places réservées', async ({ page }) => {
  await viderEvenements();
  const e = await creerEvenement({ titre: 'Achat e2e', types: [{ nom: 'Standard', prix: 20000, quota: 10 }] });
  await page.goto(`/evenements/${e.slug}`);
  await page.getByRole('button', { name: 'Ajouter un billet Standard' }).click();
  await page.getByRole('button', { name: 'Ajouter un billet Standard' }).click();
  await page.getByRole('link', { name: 'Continuer' }).click();
  await expect(page.getByText('Étape 1 sur 4 · Connexion')).toBeVisible();
  const depuis = new Date();
  await page.getByRole('textbox', { name: 'Numéro' }).fill('811230002');
  await page.getByRole('button', { name: 'Recevoir le code' }).click();
  await page.getByLabel('Chiffre 1').fill(await dernierCode('+243811230002', depuis));
  await page.waitForURL(/\/achat\/ET-[A-Z0-9]{6}$/);
  await expect(page.getByText('2 × Standard')).toBeVisible();
  const code = page.url().split('/').pop()!;
  const commande = await db.order.findUniqueOrThrow({ where: { code } });
  expect(commande).toMatchObject({ statut: 'EN_ATTENTE', totalCdf: 40000, telephone: '+243811230002' });
  expect((await db.ticketType.findUniqueOrThrow({ where: { id: e.typesBillet[0]!.id } })).restant).toBe(8);
});
