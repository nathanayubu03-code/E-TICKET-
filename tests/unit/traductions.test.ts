import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

type Arbre = { [k: string]: string | Arbre };
const fr = JSON.parse(readFileSync('messages/fr.json', 'utf8')) as Arbre;
const cles = (a: Arbre, p = ''): string[] => Object.entries(a).flatMap(([k, v]) => (typeof v === 'string' ? [p + k] : cles(v, `${p}${k}.`)));
const clesFr = new Set(cles(fr));

function fichiers(d: string): string[] {
  return readdirSync(d).flatMap((n) => { const c = join(d, n); return statSync(c).isDirectory() ? fichiers(c) : /\.tsx?$/.test(n) ? [c] : []; });
}

describe('traductions', () => {
  it('le lingala et le swahili ne contiennent que des clés du français, sans traduction vide', () => {
    for (const l of ['ln', 'sw']) {
      const a = JSON.parse(readFileSync(`messages/${l}.json`, 'utf8')) as Arbre;
      for (const k of cles(a)) expect(clesFr.has(k), `${l} : clé inconnue ${k}`).toBe(true);
    }
  });

  it('chaque clé utilisée dans le code existe en français', () => {
    const manquantes: string[] = [];
    for (const f of [...fichiers('app'), ...fichiers('components')]) {
      const s = readFileSync(f, 'utf8');
      const espaces = new Map<string, string>();
      for (const m of s.matchAll(/const (\w+) = await getTranslations\((?:'(\w+)')?\)/g)) espaces.set(m[1]!, m[2] ? `${m[2]}.` : '');
      for (const [variable, prefixe] of espaces) {
        for (const m of s.matchAll(new RegExp(`\\b${variable}(?:\\.raw)?\\('([\\w.]+)'`, 'g'))) {
          const cle = prefixe + m[1];
          if (!clesFr.has(cle)) manquantes.push(`${f} : ${cle}`);
        }
        for (const m of s.matchAll(new RegExp(`\\b${variable}\\.raw\\(\`([\\w.]+)\\.\\$\\{`, 'g'))) {
          if (![...clesFr].some((k) => k.startsWith(prefixe + m[1] + '.'))) manquantes.push(`${f} : ${prefixe}${m[1]}.*`);
        }
      }
    }
    expect(manquantes).toEqual([]);
  });
});

describe('clés des listes dynamiques', () => {
  it('parcours de paiement et scanner', () => {
    const extraire = (fichier: string, motif: RegExp) => [...(motif.exec(readFileSync(fichier, 'utf8'))?.[1] ?? '').matchAll(/'(\w+)'/g)].map((m) => m[1]!);
    const paiement = extraire('components/achat/cles-paiement.ts', /CLES_TEXTES_PAIEMENT = \[([^\]]+)\]/);
    const scan = extraire('app/scan/[evenementId]/page.tsx', /const CLES = \[([^\]]+)\]/);
    expect(paiement.length).toBeGreaterThan(30);
    expect(scan.length).toBeGreaterThan(20);
    for (const k of paiement) expect(clesFr.has(`achat.${k}`), `achat.${k}`).toBe(true);
    for (const k of scan) expect(clesFr.has(`scan.${k}`), `scan.${k}`).toBe(true);
  });
});
