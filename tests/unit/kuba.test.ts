import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fnv1a, motifKuba, motifSVG, motifSVGInline, phaseA, signeDuMoment, zoneQR, type OptionsInline, type OptionsMotif } from '@/lib/kuba';

// Références produites par le kuba.js original (scripts/kuba-reference.mjs).
// Si un test échoue, c'est le port TypeScript qui a tort.
interface Ref {
  fnv1a: Record<string, number>;
  motifs: { id: string; options: OptionsMotif; empreinte: string }[];
  svg: { id: string; options: OptionsMotif; empreinte: string }[];
  inline: { id: string; options: OptionsInline; empreinte: string }[];
  signes: { sel: string; phase: number; resultat: unknown }[];
  phases: { ms: number; dec: number; resultat: number }[];
  zones: { cols: number; resultat: unknown }[];
  exemples: { id: string; options: OptionsMotif; svg: string }[];
}
const ref: Ref = JSON.parse(readFileSync('tests/fixtures/kuba.json', 'utf8'));
const empreinte = (v: unknown) => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex');

describe('parité avec design/maquette/assets/kuba.js', () => {
  it('couvre au moins 20 identifiants et plusieurs phases', () => {
    expect(Object.keys(ref.fnv1a).length).toBeGreaterThanOrEqual(20);
    expect(new Set(ref.signes.map((s) => s.phase)).size).toBeGreaterThan(3);
  });

  it('fnv1a identique', () => {
    for (const [id, h] of Object.entries(ref.fnv1a)) expect(fnv1a(id)).toBe(h);
  });

  it('motifKuba identique (cases, chemins, palette)', () => {
    for (const r of ref.motifs) expect(empreinte(motifKuba(r.id, r.options)), `${r.id} ${JSON.stringify(r.options)}`).toBe(r.empreinte);
  });

  it('motifSVG identique octet pour octet', () => {
    for (const r of ref.svg) expect(empreinte(motifSVG(r.id, r.options)), `${r.id} ${JSON.stringify(r.options)}`).toBe(r.empreinte);
    for (const e of ref.exemples) expect(motifSVG(e.id, e.options)).toBe(e.svg);
  });

  it('rendu inline identique à motifSVGInline de la maquette (sans QR)', () => {
    for (const r of ref.inline) expect(empreinte(motifSVGInline(r.id, r.options)), `${r.id} ${JSON.stringify(r.options)}`).toBe(r.empreinte);
  });

  it('signe du moment identique', () => {
    for (const r of ref.signes) expect(signeDuMoment(r.sel, r.phase)).toEqual(r.resultat);
  });

  it('phase et décalage d’horloge identiques', () => {
    for (const r of ref.phases) expect(phaseA(r.ms, r.dec)).toBe(r.resultat);
  });

  it('zone QR identique', () => {
    for (const r of ref.zones) expect(zoneQR(r.cols)).toEqual(r.resultat);
  });
});

describe('propriétés du motif', () => {
  it('la zone du QR code reste vide sur la grille 11 × 11', () => {
    const { cases } = motifKuba('ET-2BX9-LM04', { cols: 11, rows: 11, trou: true, phase: 3 });
    for (const c of cases) expect(c.x >= 2 && c.x <= 8 && c.y >= 2 && c.y <= 8).toBe(false);
  });

  it('le motif change à chaque phase', () => {
    expect(motifKuba('ET-7K4Q-19XZ', { phase: 10 }).cases).not.toEqual(motifKuba('ET-7K4Q-19XZ', { phase: 11 }).cases);
  });
});
