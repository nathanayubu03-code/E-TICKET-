import { test, type Page } from '@playwright/test';
import { db } from '../../lib/db';
import { connecterAdmin } from '../e2e/aide';
import { preparer } from './donnees';

// Captures demandées à chaque étape d'interface : 360 px et 1280 px, clair et sombre,
// à côté de la page équivalente de la maquette.
// Lancer : ETAPE=04 npx playwright test --project=captures
const ETAPE = process.env.ETAPE ?? '00';
const DOSSIER = `docs/captures/etape-${ETAPE}`;
const PAGES: { nom: string; app: string; maquette?: string; donnees?: string; admin?: boolean }[] = JSON.parse(process.env.CAPTURES ?? '[{"nom":"accueil","app":"/","maquette":"index.html"}]');

test.describe.configure({ mode: 'serial' });
const TAILLES = [360, 1280] as const;
const THEMES = ['light', 'dark'] as const;

async function capturer(page: Page, url: string, fichier: string, largeur: number, theme: 'light' | 'dark') {
  await page.setViewportSize({ width: largeur, height: largeur === 360 ? 800 : 900 });
  await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: fichier, fullPage: true });
}

for (const p of PAGES) {
  test(`préparer ${p.nom}`, async () => { if (p.donnees) await preparer(p.donnees); });
  for (const largeur of TAILLES) {
    for (const theme of THEMES) {
      test(`${p.nom} ${largeur} ${theme}`, async ({ page }) => {
        if (p.admin) await connecterAdmin(page);
        // {slug} dans l'adresse est remplacé par l'identifiant de l'événement correspondant.
        let app = p.app;
        for (const m of app.matchAll(/\{([\w-]+)\}/g)) app = app.replace(m[0], (await db.event.findUniqueOrThrow({ where: { slug: m[1]! } })).id);
        await capturer(page, app, `${DOSSIER}/${p.nom}-${largeur}-${theme}.png`, largeur, theme);
        if (p.maquette) await capturer(page, `http://localhost:3200/${p.maquette}`, `${DOSSIER}/${p.nom}-${largeur}-${theme}-maquette.png`, largeur, theme);
      });
    }
  }
}
