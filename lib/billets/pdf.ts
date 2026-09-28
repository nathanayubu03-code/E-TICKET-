import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import { cdf } from '@/lib/argent';
import { dateCourte } from '@/lib/fuseaux';
import { contenuQR } from './qr';

/** Libellés dans la langue du visiteur (messages billet.*). */
export interface LibellesPdf { titre: string; numero: string; categorie: string; prixPaye: string; titulaire: string; entree: string; mention: string }

interface DonneesPdf {
  publicId: string; code: string; categorie: string; titulaire: string | null; entree: string | null; prixPayeCdf: number;
  evenement: { code: string; titre: string; sousTitre: string | null; debutLe: Date | null; fuseau: string | null; lieu: string; ville: string };
}

const NUIT = rgb(0.078, 0.071, 0.055);
const BRAISE = rgb(0.784, 0.063, 0.18);
const IVOIRE = rgb(0.984, 0.961, 0.902);
const DOUX = rgb(0.361, 0.329, 0.275);

// Caractères absents de l'encodage WinAnsi des polices standard du PDF.
const winAnsi = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^\x20-\x7e -ÿ•€]/g, '');

/** PDF d'un billet : format A6, polices standard (aucune police embarquée), QR vectoriel. Quelques kilo-octets. */
export async function pdfBillet(b: DonneesPdf, l: LibellesPdf, langue?: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(l.titre);
  doc.setCreator('e-Ticket RDC');
  const page = doc.addPage([298, 420]); // A6 en points
  const gras = await doc.embedFont(StandardFonts.HelveticaBold);
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const { width, height } = page.getSize();

  page.drawRectangle({ x: 0, y: height - 118, width, height: 118, color: BRAISE });
  page.drawText('e-Ticket RDC', { x: 18, y: height - 30, size: 12, font: gras, color: IVOIRE });
  const titre = winAnsi(b.evenement.titre);
  const taille = titre.length > 26 ? 15 : 20;
  page.drawText(titre.slice(0, 60), { x: 18, y: height - 58, size: taille, font: gras, color: IVOIRE, maxWidth: width - 36 });
  const quand = b.evenement.debutLe ? winAnsi(dateCourte(b.evenement.debutLe, b.evenement.fuseau ?? undefined, langue)) : '';
  page.drawText(quand, { x: 18, y: height - 86, size: 10, font: normal, color: IVOIRE });
  page.drawText(winAnsi([b.evenement.lieu, b.evenement.ville].filter(Boolean).join(', ')).slice(0, 60), { x: 18, y: height - 101, size: 10, font: normal, color: IVOIRE });

  // QR noir sur blanc, marge de 4 modules, jamais recoloré.
  const qr = QRCode.create(contenuQR(b.evenement.code, b.code), { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  const cote = 170;
  const m = cote / (n + 8);
  const x0 = (width - cote) / 2;
  const y0 = height - 128 - cote;
  page.drawRectangle({ x: x0, y: y0, width: cote, height: cote, color: rgb(1, 1, 1), borderColor: NUIT, borderWidth: 1 });
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (qr.modules.get(x, y)) page.drawRectangle({ x: x0 + (4 + x) * m, y: y0 + cote - (4 + y + 1) * m, width: m + 0.02, height: m + 0.02, color: rgb(0, 0, 0) });
  }

  const lignes: [string, string][] = [
    [l.numero, b.publicId], [l.categorie, b.categorie], [l.prixPaye, cdf(b.prixPayeCdf, undefined, langue)],
    ...(b.titulaire ? [[l.titulaire, b.titulaire] as [string, string]] : []), ...(b.entree ? [[l.entree, b.entree] as [string, string]] : []),
  ];
  let y = y0 - 24;
  for (const [cle, valeur] of lignes) {
    page.drawText(winAnsi(cle), { x: 18, y, size: 9, font: normal, color: DOUX });
    page.drawText(winAnsi(valeur).slice(0, 40), { x: 100, y, size: 10, font: gras, color: NUIT });
    y -= 16;
  }
  page.drawText(winAnsi(l.mention), { x: 18, y: 18, size: 7.5, font: normal, color: DOUX, maxWidth: width - 36 });
  return doc.save({ useObjectStreams: true });
}
