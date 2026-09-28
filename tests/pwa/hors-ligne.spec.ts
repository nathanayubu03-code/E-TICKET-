import { spawn, type ChildProcess } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { creerCommande } from '../../lib/commandes';
import { db } from '../../lib/db';
import { creerEvenement, viderEvenements } from '../e2e/aide';

let serveur: ChildProcess | null = null;

async function demarrer() {
  serveur = spawn('npx', ['next', 'start', '-p', '3300'], { env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL, PAYMENT_PROVIDER: 'non_configure', SMS_PROVIDER: 'non_configure', APP_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'https://billets.exemple.cd' }, stdio: 'ignore', detached: true });
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch('http://localhost:3300/api/sante')).ok) return; } catch { /* pas encore prêt */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Serveur non démarré');
}
function arreter() {
  if (serveur?.pid) try { process.kill(-serveur.pid, 'SIGKILL'); } catch { /* déjà arrêté */ }
  serveur = null;
}

/** Attend que plus rien ne réponde sur le port : sinon la « coupure » pourrait encore passer par le serveur. */
async function attendreArret() {
  for (let i = 0; i < 40; i++) {
    try { await fetch('http://localhost:3300/api/sante', { signal: AbortSignal.timeout(500) }); } catch { return; }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Le serveur répond encore');
}

test.afterAll(arreter);

test('PWA : manifeste, service worker, billets ouverts serveur coupé, page de secours', async ({ page, request }) => {
  await demarrer();
  const m = await request.get('/manifest.webmanifest');
  expect(m.ok()).toBe(true);
  expect((await m.json()).name).toBe('e-Ticket RDC');
  expect((await request.get('/manifeste-scanner.webmanifest')).ok()).toBe(true);

  await viderEvenements();
  const e = await creerEvenement({ titre: 'Hors ligne PWA', types: [{ nom: 'Entrée', prix: 0, quota: 5 }] });
  const c = await creerCommande({ telephone: '+243971004004', userId: null, evenementId: e.id, lignes: [{ typeId: e.typesBillet[0]!.id, quantite: 1 }] });
  const b = await db.ticket.findFirstOrThrow({ where: { commandeId: c.id } });

  // APP_ENV=production : la page de comparaison des polices n'existe pas.
  expect((await page.goto('/test-typo'))?.status()).toBe(404);
  await page.goto('/');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.goto(`/b/${b.code}`);
  await expect(page.getByRole('img', { name: `QR code du billet ${b.publicId} entouré de son motif vivant` })).toBeVisible();
  await page.goto('/mes-billets');
  await expect(page.locator('.ligne-billet')).toHaveCount(1);

  // Coupure totale : plus aucun serveur ne répond.
  arreter();
  await attendreArret();
  await page.reload();
  await expect(page.locator('.ligne-billet')).toHaveCount(1);
  await expect(page.getByRole('img', { name: /QR code du billet ET-/ })).toBeVisible();
  await page.goto(`/b/${b.code}`);
  await expect(page.getByText(b.publicId).first()).toBeVisible();
  await page.goto('/evenements/page-jamais-liee-ni-visitee');
  await expect(page.getByRole('heading', { name: 'La connexion a coupé' })).toBeVisible();
});
