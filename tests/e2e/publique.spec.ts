import { expect, test } from '@playwright/test';
import { creerEvenement, viderEvenements } from './aide';

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
