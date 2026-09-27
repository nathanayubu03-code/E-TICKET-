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

async function acheter(page: import('@playwright/test').Page, tel: string, slug: string) {
  await page.goto(`/evenements/${slug}`);
  await page.getByRole('button', { name: 'Ajouter un billet Standard' }).click();
  await page.getByRole('link', { name: 'Continuer' }).click();
  const depuis = new Date();
  await page.getByRole('textbox', { name: 'Numéro' }).fill(tel);
  await page.getByRole('button', { name: 'Recevoir le code' }).click();
  await page.getByLabel('Chiffre 1').fill(await dernierCode('+243' + tel, depuis));
  await page.waitForURL(/\/achat\/ET-[A-Z0-9]{6}$/);
}

test('achat complet en simulation : opérateur, attente, confirmation, billet affiché, SMS journalisé', async ({ page }) => {
  await viderEvenements();
  const e = await creerEvenement({ titre: 'Achat complet', types: [{ nom: 'Standard', prix: 25000, quota: 10 }] });
  await acheter(page, '971230003', e.slug);
  await expect(page.getByRole('heading', { name: 'Payer avec' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Airtel Money/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Payer 25 000 CDF' }).click();
  await expect(page.getByRole('heading', { name: 'Validez sur votre téléphone' })).toBeVisible();
  await expect(page.getByText('Payer 25000 CDF à E-TICKET RDC ?')).toBeVisible();
  await expect(page.getByRole('heading', { name: "C'est bon ! Vos billets sont prêts." })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByLabel(/^Billet Achat complet, Standard$/)).toBeVisible();
  await expect(page.getByRole('img', { name: /QR code du billet ET-/ })).toBeVisible();
  const code = page.url().split('/').pop()!;
  const c = await db.order.findUniqueOrThrow({ where: { code }, include: { billets: true } });
  expect(c.statut).toBe('PAYEE');
  expect(c.billets).toHaveLength(1);
  expect(await db.smsLog.count({ where: { telephone: '+243971230003', gabarit: 'billets' } })).toBe(1);
});

test('paiement refusé par l’opérateur : écran refusé et nouvel essai possible', async ({ page }) => {
  await viderEvenements();
  const e = await creerEvenement({ titre: 'Achat refusé', types: [{ nom: 'Standard', prix: 25000, quota: 10 }] });
  await acheter(page, '971230000', e.slug);
  await page.getByRole('button', { name: 'Payer 25 000 CDF' }).click();
  await expect(page.getByRole('heading', { name: 'Paiement refusé' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Aucun montant n'a été débité.")).toBeVisible();
  await expect(page.getByRole('button', { name: 'Réessayer' })).toBeEnabled();
  await page.getByRole('button', { name: 'Choisir un autre opérateur' }).click();
  await expect(page.getByRole('heading', { name: 'Payer avec' })).toBeVisible();
});
