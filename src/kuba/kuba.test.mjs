import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fnv1a, motifKuba, motifSVG, phaseA, signeDuMoment, PHASE_MS } from './kuba.js';

test('fnv1a donne les valeurs de référence', () => {
  assert.equal(fnv1a(''), 0x811c9dc5);
  assert.equal(fnv1a('a'), 0xe40c292c);
  assert.equal(fnv1a('foobar'), 0xbf9cf968);
});

test('même identifiant et même phase : motif identique', () => {
  const a = motifKuba('ET-7K4Q-19XZ', { phase: 58000000 });
  const b = motifKuba('ET-7K4Q-19XZ', { phase: 58000000 });
  assert.deepEqual(a, b);
});

test('un caractère de différence change le motif', () => {
  const a = motifKuba('ET-7K4Q-19XZ', { phase: 1 });
  const b = motifKuba('ET-7K4Q-19XY', { phase: 1 });
  assert.notDeepEqual(a.chemins, b.chemins);
});

test('le motif change à chaque phase', () => {
  const a = motifKuba('ET-7K4Q-19XZ', { phase: 10 });
  const b = motifKuba('ET-7K4Q-19XZ', { phase: 11 });
  assert.notDeepEqual(a.cases, b.cases);
});

test('la zone du QR code reste vide', () => {
  const { cases } = motifKuba('ET-2BX9-LM04', { cols: 11, rows: 11, trou: true, phase: 3 });
  for (const c of cases) {
    const dansQR = c.x >= 2 && c.x <= 8 && c.y >= 2 && c.y <= 8;
    assert.equal(dansQR, false, `case (${c.x}, ${c.y}) dans la zone QR`);
  }
});

test('le motif est symétrique (miroir ou quart de tour)', () => {
  for (const id of ['ET-7K4Q-19XZ', 'ET-2BX9-LM04', 'ET-A1B2-C3D4', 'ET-QX51-8HNB']) {
    const { cases } = motifKuba(id, { phase: 0 });
    const occupe = new Set(cases.map((c) => c.x + ',' + c.y));
    for (const c of cases) {
      const miroir = occupe.has((10 - c.x) + ',' + (10 - c.y));
      assert.ok(miroir, `${id} : case (${c.x}, ${c.y}) sans symétrique central`);
    }
  }
});

test('phaseA tient compte du décalage d’horloge', () => {
  assert.equal(phaseA(PHASE_MS * 10 + 5), 10);
  assert.equal(phaseA(PHASE_MS * 10 - 1, 2), 10);
});

test('signe du moment stable sur 30 s, commun à l’événement', () => {
  const s1 = signeDuMoment('EVT-RUMBA-1411', 42);
  const s2 = signeDuMoment('EVT-RUMBA-1411', 42);
  assert.deepEqual(s1, s2);
});

test('motifSVG produit un SVG léger', () => {
  const svg = motifSVG('ET-7K4Q-19XZ', { phase: 7 });
  assert.match(svg, /^<svg /);
  assert.ok(svg.length < 12000, `SVG trop lourd : ${svg.length} octets`);
});
