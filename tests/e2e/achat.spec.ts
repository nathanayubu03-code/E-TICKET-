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
  expect(commande).toMatchObject({ statut: 'EN_ATTENTE', total: 40000, telephone: '+243811230002' });
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
  await expect(page.getByRole('heading', { name: 'Validez 25 000 CDF sur votre téléphone' })).toBeVisible();
  await expect(page.getByText('Payer 25 000 CDF à E-TICKET RDC ?')).toBeVisible();
  // Aucune catégorie n'a de prix en USD : pas de choix de devise.
  await expect(page.getByRole('button', { name: /Payer en USD/ })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: "C'est bon ! Vos billets sont prêts." })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByLabel(/^Billet Achat complet, Standard$/)).toBeVisible();
  await expect(page.getByRole('img', { name: /QR code du billet ET-/ })).toBeVisible();
  const code = page.url().split('/').pop()!;
  const c = await db.order.findUniqueOrThrow({ where: { code }, include: { billets: true } });
  expect(c.statut).toBe('PAYEE');
  expect(c.billets).toHaveLength(1);
  expect(await db.smsLog.count({ where: { telephone: '+243971230003', gabarit: 'billets' } })).toBe(1);
});

test('paiement en USD : les deux prix, choix de la devise avant l’opérateur, montant et attente en USD, billet payé en USD', async ({ page }) => {
  await viderEvenements();
  const e = await creerEvenement({ titre: 'Achat dollars', types: [{ nom: 'Standard', prix: 25000, prixUsd: 1000, quota: 10 }] });
  await page.goto(`/evenements/${e.slug}`);
  await expect(page.getByText('25 000 CDF · 10 USD')).toBeVisible();
  await acheter(page, '971230007', e.slug);
  const cdf = page.getByRole('button', { name: /Payer en CDF/ });
  const usd = page.getByRole('button', { name: /Payer en USD/ });
  await expect(cdf).toHaveAttribute('aria-pressed', 'true');
  await expect(usd).toContainText('10 USD');
  // Le choix de devise précède le choix de l'opérateur.
  const yDevise = (await usd.boundingBox())!.y;
  expect(yDevise).toBeLessThan((await page.getByRole('button', { name: /Airtel Money/ }).boundingBox())!.y);
  await usd.click();
  await expect(usd).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Votre portefeuille Mobile Money en USD sera débité.')).toBeVisible();
  await expect(page.locator('.montant')).toHaveText('10 USD');
  await page.getByRole('button', { name: 'Payer 10 USD' }).click();
  await expect(page.getByRole('heading', { name: 'Validez 10 USD sur votre téléphone' })).toBeVisible();
  await expect(page.getByText('Payer 10 USD à E-TICKET RDC ?')).toBeVisible();
  await expect(page.getByRole('heading', { name: "C'est bon ! Vos billets sont prêts." })).toBeVisible({ timeout: 20_000 });
  const code = page.url().split('/').pop()!;
  const c = await db.order.findUniqueOrThrow({ where: { code }, include: { billets: true, paiements: true } });
  expect(c).toMatchObject({ statut: 'PAYEE', devise: 'USD', total: 1000 });
  expect(c.paiements[0]).toMatchObject({ devise: 'USD', montant: 1000 });
  expect(c.billets[0]).toMatchObject({ devise: 'USD', prixPaye: 1000 });
  await expect(page.getByText('10 USD').first()).toBeVisible(); // prix payé sur le billet
  expect((await db.smsLog.findFirstOrThrow({ where: { telephone: '+243971230007', gabarit: 'billets' } })).contenu).toContain('(10 USD)');
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
