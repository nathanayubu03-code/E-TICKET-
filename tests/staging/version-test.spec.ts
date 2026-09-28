import { expect, test } from '@playwright/test';
import { db } from '../../lib/db';
import { dernierCode } from '../e2e/aide';

// Serveur lancé avec APP_ENV=staging (playwright.config.ts, port 3101).
const BANDEAU = 'Version de test : aucun paiement réel, codes SMS affichés à l\'écran';

test.describe.configure({ mode: 'serial' });

for (const chemin of ['/', '/aide', '/connexion', '/admin/connexion', '/scan']) {
  test(`bandeau rouge fixe en haut de ${chemin}`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto(chemin);
    const bandeau = page.getByRole('note').filter({ hasText: BANDEAU });
    await expect(bandeau).toBeVisible();
    const boite = (await bandeau.boundingBox())!;
    expect(boite.y).toBe(0);
    expect(boite.width).toBe(360);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
    expect(await bandeau.evaluate((e) => [getComputedStyle(e).position, getComputedStyle(e).backgroundColor])).toEqual(['fixed', 'rgb(200, 16, 46)']);
    // Le bandeau reste en place au défilement et ne recouvre pas le haut de la page.
    await page.mouse.wheel(0, 600);
    expect((await bandeau.boundingBox())!.y).toBe(0);
    const entete = page.locator('.entete');
    if (await entete.count()) expect((await entete.boundingBox())!.y).toBeGreaterThanOrEqual(boite.height - 1);
  });
}

test('connexion acheteur : le code OTP s’affiche sous le champ de saisie et fonctionne', async ({ page }) => {
  const tel = '+243971230077';
  await db.otpCode.deleteMany({ where: { telephone: tel } });
  await db.rateLimit.deleteMany({});
  const depuis = new Date();
  await page.goto('/connexion?suite=/aide');
  await page.getByLabel('Numéro').fill('971230077');
  await page.getByRole('button', { name: 'Recevoir le code' }).click();
  const affiche = page.locator('.code-test');
  await expect(affiche).toBeVisible();
  const code = await dernierCode(tel, depuis);
  await expect(affiche).toHaveText(`Code de test : ${code}`);
  // Directement sous les cases du code.
  const cases = (await page.getByLabel('Chiffre 6').boundingBox())!;
  expect((await affiche.boundingBox())!.y).toBeGreaterThan(cases.y + cases.height - 1);
  await page.getByLabel('Chiffre 1').fill(code);
  await page.waitForURL((u) => u.pathname === '/aide');
});

test('connexion administrateur : le code de la deuxième étape s’affiche sous le champ', async ({ page }) => {
  await db.otpCode.deleteMany({ where: { telephone: '+243990000001' } });
  await db.rateLimit.deleteMany({});
  const depuis = new Date();
  await page.goto('/admin/connexion');
  await page.getByLabel('Numéro').fill('990000001');
  await page.getByLabel('Mot de passe').fill('MotDePasseE2E-tres-long-2026');
  await page.getByRole('button', { name: 'Continuer' }).click();
  const champ = page.getByLabel('Code reçu par SMS');
  await expect(champ).toBeVisible();
  const code = await dernierCode('+243990000001', depuis);
  const affiche = page.locator('.code-test');
  await expect(affiche).toHaveText(`Code de test : ${code}`);
  expect((await affiche.boundingBox())!.y).toBeGreaterThan((await champ.boundingBox())!.y);
  await champ.fill(code);
  await page.getByRole('button', { name: 'Valider le code' }).click();
  await page.waitForURL((u) => u.pathname === '/admin');
});
