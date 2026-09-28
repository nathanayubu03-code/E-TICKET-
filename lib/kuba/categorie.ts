import { PALETTES, type Palette } from './kuba';
import { motifSVGInline, type OptionsInline } from './rendu';

// Couverture d'un événement sans affiche : la géométrie vient de lib/kuba (identifiant de
// l'événement), les couleurs de la palette Kuba dont le fond est celui de sa catégorie.
export function paletteCategorie(fond: string | null | undefined): Palette | undefined {
  if (!fond) return undefined;
  // Fond clair des Spectacles (#F1E6CC) : pas de palette identique, la palette ivoire est la plus proche.
  return PALETTES.find((p) => p.fond.toLowerCase() === fond.toLowerCase()) ?? PALETTES[4];
}

export function couvertureSVG(id: string, fondCategorie: string | null | undefined, options: OptionsInline = {}): string {
  return motifSVGInline(id, { cols: 12, rows: 5, ...options, trou: false, palette: paletteCategorie(fondCategorie) });
}
