import { expect, test } from '@playwright/test';

test('en-têtes de sécurité et CSP avec nonce sur les pages', async ({ page }) => {
  const r = await page.goto('/');
  const h = r!.headers();
  const csp = h['content-security-policy']!;
  expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("object-src 'none'");
  expect(h['x-frame-options']).toBe('DENY');
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['permissions-policy']).toContain('camera=(self)');
  const nonce = /'nonce-([^']+)'/.exec(csp)![1]!;
  // Chaque <script> du HTML rendu par le serveur porte le nonce (les scripts ajoutés ensuite passent par 'strict-dynamic').
  const html = await r!.text();
  const balises = html.match(/<script\b[^>]*>/g) ?? [];
  expect(balises.length).toBeGreaterThan(0);
  for (const b of balises) expect(b).toContain(`nonce="${nonce}"`);
});

test('routes internes : requête d’une autre origine refusée, sans session refusée', async ({ request }) => {
  const autre = await request.post('/api/scan/xyz/verifier', { headers: { Origin: 'https://site-malveillant.example' }, data: {} });
  expect(autre.status()).toBe(403);
  const sansSession = await request.post('/api/scan/xyz/verifier', { data: {} });
  expect(sansSession.status()).toBe(401);
  expect((await request.get('/api/scan/xyz/manifeste')).status()).toBe(401);
  expect((await request.get('/api/cron/verifier-paiements')).status()).toBe(401);
  expect((await request.get('/api/cron/verifier-paiements', { headers: { Authorization: 'Bearer mauvais' } })).status()).toBe(401);
  expect((await request.get('/api/exports/evenements/xyz')).status()).toBe(401);
});

test('webhook : signature fausse refusée', async ({ request }) => {
  const r = await request.post('/api/webhooks/paiement/simulation', { data: { id: 'x', statut: 'REUSSI' }, headers: { 'x-simulation-signature': 'fausse' } });
  expect(r.status()).toBe(401);
});
