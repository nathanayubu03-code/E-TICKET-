import { expect, test } from '@playwright/test';
import { connecterAdmin, viderEvenements } from './aide';

test.describe.configure({ mode: 'serial' });

test('sans connexion, l’administration renvoie vers la connexion', async ({ page }) => {
  await page.goto('/admin/evenements');
  await expect(page).toHaveURL(/\/admin\/connexion\?suite=%2Fadmin%2Fevenements/);
});

test('mauvais mot de passe : message générique', async ({ page }) => {
  await page.goto('/admin/connexion');
  await page.getByLabel('Numéro').fill('990000001');
  await page.getByLabel('Mot de passe').fill('mauvais-mot-de-passe-1');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByText('Numéro ou mot de passe incorrect.')).toBeVisible();
});

test('un administrateur crée un événement avec deux catégories et le publie en moins de 5 minutes', async ({ page }) => {
  test.setTimeout(5 * 60_000);
  page.setDefaultTimeout(20_000);
  await viderEvenements();
  const debut = Date.now();
  await connecterAdmin(page);

  await page.goto('/admin/organisateurs/nouveau');
  await page.getByLabel('Nom', { exact: true }).fill('Organisateur e2e');
  await page.getByRole('button', { name: 'Créer' }).click();
  await page.waitForURL(/\/admin\/organisateurs\/c/);

  await page.goto('/admin/evenements/nouveau');
  await page.getByLabel('Titre').fill('Événement publié par e2e');
  await page.getByLabel('Catégorie').selectOption({ label: 'Concerts' });
  await page.getByRole('button', { name: 'Créer le brouillon' }).click();
  await page.waitForURL(/\/infos$/);
  await page.getByLabel('Organisateur').selectOption({ label: 'Organisateur e2e' });
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText(/Brouillon enregistré à/)).toBeVisible();

  await page.getByRole('link', { name: 'Lieu et date', exact: true }).click();
  await page.getByLabel('Ville').selectOption({ label: 'Kinshasa' });
  await page.getByLabel('Lieu', { exact: true }).selectOption({ label: 'Nouveau lieu…' });
  await page.getByLabel('Nom du nouveau lieu').fill('Salle e2e');
  const jour = new Date(Date.now() + 20 * 86400_000).toISOString().slice(0, 10);
  await page.getByLabel('Date', { exact: true }).and(page.locator('input')).fill(jour);
  await page.getByLabel('Ouverture des portes').fill('18:00');
  await page.getByLabel('Début', { exact: true }).fill('20:00');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText(/Brouillon enregistré à/)).toBeVisible();

  await page.getByRole('link', { name: 'Billets', exact: true }).click();
  for (const [nom, prix, quota] of [['VIP', '100000', '50'], ['Standard', '20000', '500']] as const) {
    const bloc = page.locator('section', { has: page.getByRole('heading', { name: 'Ajouter une catégorie de billet' }) });
    await bloc.getByLabel('Nom').fill(nom);
    await bloc.getByLabel('Prix en CDF').fill(prix);
    await bloc.getByLabel('Quota').fill(quota);
    await bloc.getByRole('button', { name: 'Ajouter' }).click();
    await expect(page.getByRole('heading', { name: new RegExp(`^${nom} ·`) })).toBeVisible();
  }

  await page.getByRole('link', { name: 'Publication', exact: true }).click();
  await expect(page.getByText('Tout est prêt.')).toBeVisible();
  await page.getByRole('button', { name: "Publier l'événement" }).click();
  await expect(page.getByText('Statut actuel : Publié')).toBeVisible();

  await page.goto('/');
  await expect(page.getByText('À la une', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Événement publié par e2e' })).toBeVisible();
  expect(Date.now() - debut).toBeLessThan(5 * 60_000);
});

test('publication refusée : la liste de ce qui manque s’affiche', async ({ page }) => {
  await connecterAdmin(page);
  await page.goto('/admin/evenements/nouveau');
  await page.getByLabel('Titre').fill('Brouillon incomplet');
  await page.getByLabel('Catégorie').selectOption({ label: 'Football' });
  await page.getByRole('button', { name: 'Créer le brouillon' }).click();
  await page.waitForURL(/\/infos$/);
  await page.getByRole('link', { name: 'Publication', exact: true }).click();
  await expect(page.getByText('Pour publier, il manque :')).toBeVisible();
  await expect(page.getByText('Un organisateur')).toBeVisible();
  await expect(page.getByText('Au moins une catégorie de billet avec un prix et un quota')).toBeVisible();
});

test('tableau de bord sans vente : zéros lisibles, aucun graphique fictif', async ({ page }) => {
  await viderEvenements();
  await connecterAdmin(page);
  await page.goto('/admin');
  await expect(page.getByText('Aucune vente pour le moment.').first()).toBeVisible();
  await expect(page.locator('.kpi b').first()).toHaveText('0');
  await expect(page.getByText('0 CDF').first()).toBeVisible();
  await expect(page.locator('.admin-contenu svg, .admin-contenu canvas')).toHaveCount(0);
});

test('taux indicatif saisi par le super-administrateur : USD affiché sur la page événement', async ({ page }) => {
  await viderEvenements();
  const { creerEvenement } = await import('./aide');
  const e = await creerEvenement({ titre: 'Avec taux', types: [{ nom: 'Standard', prix: 28500, quota: 10 }] });
  await connecterAdmin(page, '/admin/parametres');
  await page.getByLabel('CDF pour 1 USD').fill('2850');
  await page.getByRole('button', { name: 'Enregistrer le taux' }).click();
  await expect(page.getByText('1 USD = 2850 CDF')).toBeVisible();
  await page.goto(`/evenements/${e.slug}`);
  await expect(page.getByText('≈ 10 USD')).toBeVisible();
});
