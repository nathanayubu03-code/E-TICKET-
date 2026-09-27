// Exécute le moteur Kuba original de la maquette et enregistre ses sorties.
// Les tests Vitest comparent le port TypeScript (lib/kuba) à ces références.
// Usage : node scripts/kuba-reference.mjs
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Empreinte SHA-256 de la sortie : garde le fichier de référence léger tout en vérifiant l'égalité exacte.
const empreinte = (v) => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex');
import * as kuba from '../design/maquette/assets/kuba.js';
import { motifSVGInline } from '../design/maquette/assets/app.js';

const IDS = [
  'ET-7K4Q-19XZ', 'ET-2BX9-LM04', 'ET-A1B2-C3D4', 'ET-QX51-8HNB', 'ET-0000-0000',
  'ET-ZZZZ-ZZZZ', 'ET-M3PA-77QD', 'ET-4F7K-92AB', 'ET-K9L2-P0Q1', 'ET-X7Y8-Z9W0',
  'JBSWY3DPEHPK3PXPJBSWY3DPEH', 'MFRGGZDFMZTWQ2LKNNWG23TPOA', 'E7K4Q9', 'EVT-TEST-0001',
  'é-accent-ü', '', 'a', 'foobar', 'ET-LONG-IDENTIFIANT-DE-TEST-123456789', 'ET-5555-AAAA',
];
const PHASES = [0, 1, 2, 3, 29, 58000000, 58000001, 99999999];
const GRILLES = [
  { cols: 11, rows: 11, trou: true },
  { cols: 11, rows: 11, trou: false },
  { cols: 12, rows: 5, trou: false },
  { cols: 20, rows: 7, trou: false },
  { cols: 4, rows: 6, trou: false },
  { cols: 7, rows: 7, trou: true },
];

const sortie = { fnv1a: {}, motifs: [], svg: [], inline: [], signes: [], phases: [], zones: [] };
for (const id of IDS) sortie.fnv1a[id] = kuba.fnv1a(id);
for (const id of IDS) {
  for (const phase of PHASES) {
    for (const g of GRILLES) {
      const options = { ...g, phase };
      sortie.motifs.push({ id, options, empreinte: empreinte(kuba.motifKuba(id, options)) });
      sortie.svg.push({ id, options, empreinte: empreinte(kuba.motifSVG(id, options)) });
    }
    sortie.inline.push({ id, options: { cols: 11, rows: 11, trou: true, phase, souffle: true }, empreinte: empreinte(motifSVGInline(id, { cols: 11, rows: 11, trou: true, phase, souffle: true })) });
    sortie.inline.push({ id, options: { cols: 12, rows: 5 }, empreinte: empreinte(motifSVGInline(id, { cols: 12, rows: 5 })) });
    sortie.signes.push({ sel: id, phase, resultat: kuba.signeDuMoment(id, phase) });
  }
}
sortie.motifs.push({ id: 'ET-7K4Q-19XZ', options: {}, empreinte: empreinte(kuba.motifKuba('ET-7K4Q-19XZ')) });
// Deux sorties complètes, lisibles en cas d'écart.
sortie.exemples = [
  { id: 'ET-7K4Q-19XZ', options: { phase: 58000000 }, svg: kuba.motifSVG('ET-7K4Q-19XZ', { phase: 58000000 }) },
  { id: 'E7K4Q9', options: { cols: 12, rows: 5, trou: false }, svg: kuba.motifSVG('E7K4Q9', { cols: 12, rows: 5, trou: false }) },
];
for (const [ms, dec] of [[0, 0], [29999, 0], [30000, 0], [1790503375000, 0], [1790503375000, -45000], [1790503375000, 120000]]) {
  sortie.phases.push({ ms, dec, resultat: kuba.phaseA(ms, dec) });
}
for (const cols of [7, 11, 13]) sortie.zones.push({ cols, resultat: kuba.zoneQR(cols) });

writeFileSync('tests/fixtures/kuba.json', JSON.stringify(sortie));
console.log(`${sortie.motifs.length} motifs, ${sortie.svg.length} SVG, ${sortie.inline.length} inline, ${sortie.signes.length} signes`);
