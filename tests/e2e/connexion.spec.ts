import { expect, test } from '@playwright/test';
import { db } from '../../lib/db';
import { dernierCode } from './aide';

test.describe.configure({ mode: 'serial' });

test('connexion acheteur : numéro, code faux puis bon code collé en une fois', async ({ page }) => {
  const tel = '+243971230001';
  await db.otpCode.deleteMany({ where: { telephone: tel } });
  await db.rateLimit.deleteMany({});
  const depuis = new Date();
  await page.goto('/connexion?suite=/aide');
  await page.getByLabel('Numéro').fill('971230001');
  await expect(page.getByText('Airtel')).toBeVisible();
  await page.getByRole('button', { name: 'Recevoir le code' }).click();
  await expect(page.getByText('Code envoyé au')).toBeVisible();
  await expect(page.getByRole('button', { name: /Renvoyer dans 0:4\d/ })).toBeDisabled();
  const code = await dernierCode(tel, depuis);
  const faux = code === '000000' ? '111111' : '000000';
  await page.getByLabel('Chiffre 1').fill(faux);
  await expect(page.getByText('Code incorrect. Il vous reste 4 essais.')).toBeVisible();
  await page.getByLabel('Chiffre 1').fill(code);
  await page.waitForURL('**/aide');
  await expect(page.getByRole('link', { name: 'Se connecter' })).toHaveCount(0);
  const user = await db.user.findUnique({ where: { telephone: tel } });
  expect(user?.roles).toContain('ACHETEUR');
});

test('téléphone lent : un numéro tapé avant que la page soit interactive est pris en compte', async ({ page }) => {
  await db.rateLimit.deleteMany({});
  // Le JavaScript arrive avec 3 secondes de retard, comme en 3G : on tape pendant ce temps.
  await page.route('**/_next/static/chunks/**', async (route) => { await new Promise((r) => setTimeout(r, 3000)); await route.continue(); });
  await page.goto('/connexion', { waitUntil: 'domcontentloaded' });
  await page.locator('#tel').pressSequentially('971230009');
  const bouton = page.getByRole('button', { name: 'Recevoir le code' });
  await expect(bouton).toBeEnabled({ timeout: 20_000 });
  await expect(page.locator('#tel')).toHaveValue('97 123 00 09');
});
