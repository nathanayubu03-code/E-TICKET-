// Moteur de motif Kuba d'e-Ticket.
// Même algorithme que design/project/Kuba.dc.html : l'application, le scanner et le serveur
// doivent produire exactement le même motif pour un même (identifiant, phase).
// Aucune dépendance, aucun appel réseau : fonctionne hors ligne.

export const PHASE_MS = 30000;
export const CELL = 24; // unités SVG par case

// Géométrie des 8 motifs, dans une case de 24 × 24. Chaque motif = liste de polygones.
export const MOTIFS = [
  { nom: 'losange', symetrique: true, polys: [[[12, 2], [22, 12], [12, 22], [2, 12]]] },
  { nom: 'losange-emboite', symetrique: true, polys: [[[12, 1], [23, 12], [12, 23], [1, 12]], [[12, 6], [18, 12], [12, 18], [6, 12]], [[12, 9.5], [14.5, 12], [12, 14.5], [9.5, 12]]] },
  { nom: 'ligne-brisee', symetrique: false, polys: [[[0, 15], [6, 7], [12, 15], [18, 7], [24, 15], [24, 21], [18, 13], [12, 21], [6, 13], [0, 21]]] },
  { nom: 'escalier', symetrique: false, polys: [[[0, 16], [8, 16], [8, 24], [0, 24]], [[8, 8], [16, 8], [16, 16], [8, 16]], [[16, 0], [24, 0], [24, 8], [16, 8]]] },
  { nom: 'croix', symetrique: true, polys: [[[9, 2], [15, 2], [15, 9], [22, 9], [22, 15], [15, 15], [15, 22], [9, 22], [9, 15], [2, 15], [2, 9], [9, 9]]] },
  { nom: 'sablier', symetrique: true, polys: [[[2, 2], [22, 2], [12, 12]], [[2, 22], [22, 22], [12, 12]]] },
  { nom: 'points', symetrique: true, polys: [[[3, 3], [9, 3], [9, 9], [3, 9]], [[15, 3], [21, 3], [21, 9], [15, 9]], [[3, 15], [9, 15], [9, 21], [3, 21]], [[15, 15], [21, 15], [21, 21], [15, 21]]] },
  { nom: 'bandes', symetrique: true, polys: [[[0, 4], [24, 4], [24, 9], [0, 9]], [[0, 15], [24, 15], [24, 20], [0, 20]]] },
];

// Palettes : un fond + trois couleurs. Contrastes vérifiés entre fond et motifs.
export const PALETTES = [
  { fond: '#14120E', couleurs: ['#FFD21F', '#3FA2FF', '#FF4D5E'] },
  { fond: '#FFD21F', couleurs: ['#14120E', '#C8102E', '#0059B8'] },
  { fond: '#1E8FFF', couleurs: ['#14120E', '#FFD21F', '#FBF5E6'] },
  { fond: '#C8102E', couleurs: ['#FFD21F', '#FBF5E6', '#14120E'] },
  { fond: '#FBF5E6', couleurs: ['#C8102E', '#0059B8', '#14120E'] },
];

// Signe du moment : commun à tous les billets d'un événement pendant 30 s.
export const SIGNES = [
  { nom: 'Losange jaune', couleur: '#FFD21F', forme: 'losange' },
  { nom: 'Losange bleu', couleur: '#1E8FFF', forme: 'losange' },
  { nom: 'Losange rouge', couleur: '#C8102E', forme: 'losange' },
  { nom: 'Losange blanc', couleur: '#FFFFFF', forme: 'losange' },
  { nom: 'Carré jaune', couleur: '#FFD21F', forme: 'carre' },
  { nom: 'Carré bleu', couleur: '#1E8FFF', forme: 'carre' },
  { nom: 'Carré rouge', couleur: '#C8102E', forme: 'carre' },
  { nom: 'Carré blanc', couleur: '#FFFFFF', forme: 'carre' },
];

/** FNV-1a 32 bits sur les codes UTF-16 de la chaîne. */
export function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Phase courante. `decalageMs` = heure serveur − heure du téléphone, mesurée au
 * téléchargement du billet et stockée avec lui, pour ne pas dépendre d'une horloge fausse.
 */
export function phaseA(maintenantMs = Date.now(), decalageMs = 0) {
  return Math.floor((maintenantMs + decalageMs) / PHASE_MS);
}

export function signeDuMoment(selEvenement, phase) {
  return SIGNES[fnv1a(selEvenement + ':' + phase) % SIGNES.length];
}

/** Rotation d'un quart de tour horaire autour du centre de la case. */
function tourner(x, y, quarts) {
  let px = x, py = y;
  for (let r = 0; r < quarts; r++) {
    const t = px;
    px = CELL - py;
    py = t;
  }
  return [px, py];
}

/**
 * Calcule le motif.
 * @param {string} id identifiant du billet (ou de l'événement pour une vignette)
 * @param {{cols?: number, rows?: number, trou?: boolean, phase?: number}} options
 * @returns {{fond: string, couleurs: string[], chemins: string[], cases: object[]}}
 *   chemins[i] = attribut `d` SVG de tous les polygones de la couleur i (fill-rule evenodd).
 */
export function motifKuba(id, { cols = 11, rows = 11, trou = true, phase = 0 } = {}) {
  const graine = fnv1a(id);
  const palette = PALETTES[graine % PALETTES.length];
  const rotation = ((graine >>> 3) & 1) === 1 && cols === rows;
  const autorises = rotation ? [0, 1, 2, 3, 4, 5, 6, 7] : [0, 1, 4, 5, 6, 7];
  const avecTrou = trou && cols >= 7 && rows >= 7;
  const nx = cols - 1, ny = rows - 1;
  const chemins = ['', '', ''];
  const cases = [];

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      // Zone du QR code : deux cases de bord conservées tout autour.
      if (avecTrou && x >= 2 && x <= cols - 3 && y >= 2 && y <= rows - 3) continue;

      // Case canonique : la plus petite parmi les images de (x, y) par le groupe de symétrie.
      const candidats = rotation
        ? [[x, y, 0], [nx - y, x, 1], [nx - x, ny - y, 2], [y, ny - x, 3]]
        : [[x, y, 0], [nx - x, y, 0], [x, ny - y, 0], [nx - x, ny - y, 0]];
      let canon = candidats[0];
      for (const c of candidats) {
        if (c[1] * 64 + c[0] < canon[1] * 64 + canon[0]) canon = c;
      }
      const cle = canon[1] * 64 + canon[0];
      const h = fnv1a(id + '#' + cle);

      if ((h >>> 9) % 6 === 0) continue; // respiration : 1 case sur 6 vide

      const motif = autorises[h % autorises.length];
      const tourne = ((h >>> 7) & 1) === 1 ? phase : 0; // la moitié des cases tourne à chaque phase
      const quarts = (((h >>> 5) % 4) + (rotation ? 4 - canon[2] : 0) + tourne) % 4;
      const couleur = (((h >>> 3) % 3) + phase) % 3; // les couleurs glissent d'un rang par phase

      let d = '';
      for (const poly of MOTIFS[motif].polys) {
        poly.forEach(([px0, py0], i) => {
          const [px, py] = tourner(px0, py0, quarts);
          d += (i === 0 ? 'M' : 'L') + (px + x * CELL) + ' ' + (py + y * CELL);
        });
        d += 'Z';
      }
      chemins[couleur] += d;
      cases.push({ x, y, motif, quarts, couleur });
    }
  }
  return { fond: palette.fond, couleurs: palette.couleurs, chemins, cases };
}

/** Sérialise le motif en SVG autonome (QR code non inclus : le superposer dans la zone centrale). */
export function motifSVG(id, options = {}) {
  const { cols = 11, rows = 11 } = options;
  const m = motifKuba(id, options);
  const w = cols * CELL, h = rows * CELL;
  const couches = m.chemins
    .map((d, i) => (d ? `<path d="${d}" fill="${m.couleurs[i]}" fill-rule="evenodd"/>` : ''))
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${m.fond}"/>${couches}</svg>`;
}

/** Position et taille (en unités SVG) de la zone réservée au QR code. */
export function zoneQR(cols = 11) {
  return { x: 2 * CELL, y: 2 * CELL, taille: (cols - 4) * CELL };
}
