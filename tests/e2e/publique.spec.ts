import { expect, test } from '@playwright/test';
import { creerEvenement, viderEvenements } from './aide';
import { db } from '../../lib/db';

const INTERDITS = ['Nuit de la Rumba', 'Kin Malebo', 'Kin Productions', 'Mama Kasa', 'lorem', 'EVT-RUMBA', 'Grâce Mbuyi', '2 850', '2850'];

async function sansContenuInvente(page: import('@playwright/test').Page) {
  const texte = await page.locator('body').innerText();
  for (const mot of INTERDITS) expect(texte.toLowerCase()).not.toContain(mot.toLowerCase());
  expect(texte).not.toMatch(/[—–]/);
}

test.describe.configure({ mode: 'serial' });

test('base vide : accueil propre, sans À la une ni chiffre inventé', async ({ page }) => {
  await viderEvenements();
  const erreurs: string[] = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  const reponse = await page.goto('/');
  expect(reponse?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Les prochains événements arrivent ici' })).toBeVisible();
  await expect(page.getByText('À la une', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Payer avec Mobile Money, en 3 étapes' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Vous organisez un événement ?' })).toBeVisible();
  // Contacts vides : pas de bouton de contact.
  await expect(page.getByRole('link', { name: 'Créer mon événement' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: "M'alerter" })).toBeVisible();
  await sansContenuInvente(page);
  // APP_ENV=development : pas de bandeau de version de test.
  await expect(page.getByText('Version de test', { exact: false })).toHaveCount(0);
  // 360 px : aucun défilement horizontal (le formulaire d'alerte élargissait la colonne).
  await page.setViewportSize({ width: 360, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
  expect(erreurs).toEqual([]);
});

test('alerte SMS : consentement exigé puis enregistrement', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Numéro').first().fill('971234567');
  await page.getByRole('button', { name: "M'alerter" }).click();
  await expect(page.getByText('Cochez la case pour accepter de recevoir des SMS.')).toBeVisible();
  await page.getByText("J'accepte de recevoir des SMS").click();
  await page.getByRole('button', { name: "M'alerter" }).click();
  await expect(page.getByText("C'est noté.")).toBeVisible();
});

test('un seul événement : il passe À la une, sans grille', async ({ page }) => {
  await viderEvenements();
  await creerEvenement({ titre: 'Événement unique', ville: 'Goma', cat: 'festival' });
  await page.goto('/');
  await expect(page.getByText('À la une', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Événement unique' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Trouver un événement' })).toHaveCount(0);
  await expect(page.locator('.grille')).toHaveCount(0);
  // Pied de page : seule la ville qui a un événement.
  await expect(page.locator('footer')).toContainText('Goma');
  await expect(page.locator('footer')).not.toContainText('Kinshasa');
  await sansContenuInvente(page);
});

test('plusieurs événements : filtres dérivés des données et recherche sans résultat', async ({ page }) => {
  await viderEvenements();
  await creerEvenement({ titre: 'Concert A', ville: 'Kinshasa', cat: 'concert', dansJours: 5 });
  await creerEvenement({ titre: 'Match B', ville: 'Lubumbashi', cat: 'football', dansJours: 8 });
  await creerEvenement({ titre: 'Brouillon C', ville: 'Goma', cat: 'festival', statut: 'BROUILLON' });
  await page.goto('/');
  const villes = page.getByRole('group', { name: 'Ville' });
  await expect(villes.getByRole('link')).toHaveText(['Toutes', 'Kinshasa', 'Lubumbashi']);
  const cats = page.getByRole('group', { name: 'Catégorie' });
  await expect(cats.getByRole('link')).toHaveText(['Concerts', 'Football']);
  await villes.getByRole('link', { name: 'Lubumbashi' }).click();
  await expect(page.getByRole('heading', { name: 'À Lubumbashi bientôt' })).toBeVisible();
  await expect(page.locator('.grille .carte')).toHaveCount(1);
  await page.getByLabel('Rechercher').fill('introuvable');
  await page.getByLabel('Rechercher').press('Enter');
  await expect(page.getByRole('heading', { name: 'Rien ici pour le moment' })).toBeVisible();
  await page.getByRole('link', { name: 'Effacer les filtres' }).click();
  await expect(page.locator('.grille .carte')).toHaveCount(2);
});

test('page événement : panier limité, événement complet avec liste d’attente', async ({ page }) => {
  await viderEvenements();
  const e = await creerEvenement({ titre: 'Concert D', types: [{ nom: 'VIP', prix: 150000, quota: 10, restant: 3 }, { nom: 'Standard', prix: 50000, quota: 100 }] });
  await page.goto(`/evenements/${e.slug}`);
  await expect(page.getByText('Plus que 3 places')).toBeVisible();
  const plusVip = page.getByRole('button', { name: 'Ajouter un billet VIP' });
  for (let i = 0; i < 3; i++) await plusVip.click();
  await expect(plusVip).toBeDisabled();
  const plusStd = page.getByRole('button', { name: 'Ajouter un billet Standard' });
  await plusStd.click();
  await expect(page.getByText('Limite atteinte : 4 billets par personne')).toBeVisible();
  await expect(plusStd).toBeDisabled();
  await expect(page.getByText('500 000 CDF')).toBeVisible();

  const complet = await creerEvenement({ titre: 'Concert E', types: [{ nom: 'Unique', prix: 1000, quota: 5, restant: 0 }] });
  await page.goto(`/evenements/${complet.slug}`);
  await expect(page.getByRole('button', { name: "Rejoindre la liste d'attente" })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Continuer' })).toHaveCount(0);
});

test('typographie sobre : texte 16 px, titres et boutons à la nouvelle échelle, zones tactiles de 48 px', async ({ page }) => {
  await viderEvenements();
  await creerEvenement({ titre: 'Événement test typo', types: [{ nom: 'Standard', prix: 10000, quota: 100 }] });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  const px = (sel: string, prop: string) => page.locator(sel).first().evaluate((el, p) => parseFloat(getComputedStyle(el).getPropertyValue(p)), prop);
  expect(await px('body', 'font-size')).toBe(16);
  const h1 = await px('.une h1', 'font-size');
  expect(h1).toBeGreaterThanOrEqual(28);
  expect(h1).toBeLessThanOrEqual(40);
  expect(await px('.une .btn', 'font-size')).toBe(16);
  expect(await px('.une .btn', 'height')).toBeGreaterThanOrEqual(48);
  expect(await px('.une .btn', 'height')).toBeLessThanOrEqual(56);
  expect(await px('.titre-section', 'font-size')).toBeLessThanOrEqual(26);
  // Champs : 16 px minimum (sinon iOS zoome la page).
  for (const size of await page.locator('input:visible').evaluateAll((els) => els.map((e) => parseFloat(getComputedStyle(e).fontSize)))) expect(size).toBeGreaterThanOrEqual(16);
});

test('page /test-typo : trois options côte à côte en development', async ({ page }) => {
  await page.goto('/test-typo');
  for (const n of [1, 2, 3]) await expect(page.getByTestId(`option-${n}`)).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-typo', 'bricolage');
});

test('anglais : sélecteur FR EN LN SW, textes et dates en anglais, contenu anglais saisi ou repli sur le français', async ({ page }) => {
  await viderEvenements();
  const e = await creerEvenement({ titre: 'Concert du fleuve', types: [{ nom: 'Standard', prix: 25000, quota: 100 }], dansJours: 10 });
  await db.event.update({ where: { id: e.id }, data: { titreEn: 'River concert', descriptionEn: 'An evening by the river.', description: 'Une soirée au bord du fleuve.' } });
  await creerEvenement({ titre: 'Match sans anglais', cat: 'football', dansJours: 12 });
  await page.goto('/');
  const selecteur = page.getByLabel('Langue');
  expect(await selecteur.locator('option').allTextContents()).toEqual(['FR', 'EN', 'LN', 'SW']);
  await selecteur.selectOption('en');
  await expect(page.getByRole('link', { name: 'Book my seat' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { name: 'River concert' }).first()).toBeVisible();
  await expect(page.getByText('Match sans anglais').first()).toBeVisible(); // pas de titre anglais : français affiché
  await expect(page.getByText('25,000 CDF').first()).toBeVisible();
  await page.goto(`/evenements/${e.slug}`);
  await expect(page.getByRole('heading', { name: 'River concert', level: 1 })).toBeVisible();
  await expect(page.getByText('An evening by the river.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your tickets' })).toBeVisible();
  await expect(page.getByText(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d+ [A-Z][a-z]{2} · \d\d:\d\d$/).first()).toBeVisible();
  // Retour au français.
  await page.getByLabel('Language').selectOption('fr');
  await expect(page.getByRole('heading', { name: 'Concert du fleuve', level: 1 })).toBeVisible();
});
