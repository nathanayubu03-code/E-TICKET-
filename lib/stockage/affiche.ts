import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { stockage } from './index';

// Affiche : l'original est conservé, puis recadré en 4:5 et 16:9 et compressé en WebP et AVIF.
export const FORMATS = { '4x5': { largeur: 800, hauteur: 1000 }, '16x9': { largeur: 1280, hauteur: 720 } } as const;
export type FormatAffiche = keyof typeof FORMATS;
export type Position = 'top' | 'centre' | 'bottom' | 'attention';
export const TAILLE_MAX = 8 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export interface Variantes { [format: string]: { webp: string; avif: string; position: Position } }

export async function deposerOriginal(evenementId: string, fichier: File): Promise<string> {
  if (!TYPES.includes(fichier.type)) throw new Error('Format accepté : JPEG, PNG, WebP ou AVIF.');
  if (fichier.size > TAILLE_MAX) throw new Error('Image trop lourde : 8 Mo maximum.');
  const brut = Buffer.from(await fichier.arrayBuffer());
  const meta = await sharp(brut).metadata();
  if (!meta.width || !meta.height || meta.width < 640) throw new Error('Image trop petite : 640 pixels de large minimum.');
  // Réencodage : supprime les métadonnées (EXIF, localisation) et neutralise un fichier piégé.
  const propre = await sharp(brut).rotate().jpeg({ quality: 90 }).toBuffer();
  const cle = `affiches/${evenementId}/original-${randomBytes(6).toString('hex')}.jpg`;
  await stockage().deposer(cle, propre, 'image/jpeg');
  return cle;
}

export async function genererVariantes(cleOriginal: string, positions: Partial<Record<FormatAffiche, Position>> = {}, source?: Buffer): Promise<Variantes> {
  const original = source ?? (await stockage().lire(cleOriginal));
  if (!original) throw new Error('Original introuvable.');
  const base = cleOriginal.replace(/original-[^/]+$/, '');
  const suffixe = randomBytes(4).toString('hex');
  const sortie: Variantes = {};
  for (const [format, t] of Object.entries(FORMATS) as [FormatAffiche, { largeur: number; hauteur: number }][]) {
    const position = positions[format] ?? 'attention';
    const recadre = sharp(original).resize(t.largeur, t.hauteur, { fit: 'cover', position: position === 'attention' ? sharp.strategy.attention : position === 'centre' ? 'centre' : position });
    const webp = await recadre.clone().webp({ quality: 78 }).toBuffer();
    const avif = await recadre.clone().avif({ quality: 55 }).toBuffer();
    const cw = `${base}${format}-${suffixe}.webp`;
    const ca = `${base}${format}-${suffixe}.avif`;
    await stockage().deposer(cw, webp, 'image/webp');
    await stockage().deposer(ca, avif, 'image/avif');
    sortie[format] = { webp: stockage().url(cw), avif: stockage().url(ca), position };
  }
  return sortie;
}
