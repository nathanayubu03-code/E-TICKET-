// Rendu SVG inline, repris de motifSVGInline (design/maquette/assets/app.js), sans le faux QR
// de démonstration : le vrai QR est superposé par components/billet (lib/billets/qr.ts).
import { CELL, motifKuba, type OptionsMotif } from './kuba';

export interface OptionsInline extends OptionsMotif { souffle?: boolean; label?: string }

/** Contenu SVG (fond + couches), sans la balise <svg>. */
export function couchesInline(id: string, { cols = 11, rows = 11, trou = false, phase = 0, souffle = false }: OptionsInline = {}): string {
  const m = motifKuba(id, { cols, rows, trou, phase });
  const w = cols * CELL, h = rows * CELL;
  const couches = m.chemins.map((d, i) => d
    ? `<path d="${d}" fill="${m.couleurs[i]}" fill-rule="evenodd"${souffle ? ` class="souffle" style="animation-delay:${-3 * i}s"` : ''}/>`
    : '').join('');
  return `<rect width="${w}" height="${h}" fill="${m.fond}"/>${couches}`;
}

const echapper = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Équivalent exact de motifSVGInline(id, options) sans QR. */
export function motifSVGInline(id: string, options: OptionsInline = {}): string {
  const { cols = 11, rows = 11, label = '' } = options;
  const w = cols * CELL, h = rows * CELL;
  const aria = label ? `role="img" aria-label="${echapper(label)}"` : 'aria-hidden="true"';
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" ${aria}>${couchesInline(id, { ...options, cols, rows })}</svg>`;
}
