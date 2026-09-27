import QRCode from 'qrcode';
import { zoneQR } from '@/lib/kuba';

/**
 * Contenu du QR : code court de l'événement + « / » + code du billet (base32).
 * Tout est en majuscules et chiffres : le QR utilise le mode alphanumérique, le plus compact.
 */
export const contenuQR = (codeEvenement: string, codeBillet: string) => `${codeEvenement}/${codeBillet}`;

export function lireContenuQR(texte: string): { evenement: string; code: string } | null {
  const m = /^([A-Z0-9]{4,12})\/([A-Z2-7]{26})$/.exec(texte.trim().toUpperCase());
  return m ? { evenement: m[1] as string, code: m[2] as string } : null;
}

export interface QRDessin { chemin: string; modules: number; x: number; y: number; taille: number }

/**
 * Chemin SVG du QR, placé dans la zone centrale du motif Kuba (11 × 11 cases, zone de 7 × 7).
 * Marge blanche de 4 modules, noir sur blanc, jamais animé ni recoloré.
 */
export function dessinQR(texte: string, cols = 11): QRDessin {
  const qr = QRCode.create(texte, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  const z = zoneQR(cols);
  const m = z.taille / (n + 8);
  const o = 4 * m;
  const r = (v: number) => Math.round(v * 100) / 100;
  let d = '';
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (qr.modules.get(x, y)) d += `M${r(z.x + o + x * m)} ${r(z.y + o + y * m)}h${r(m + 0.05)}v${r(m + 0.05)}h-${r(m + 0.05)}Z`;
    }
  }
  return { chemin: d, modules: n, x: z.x, y: z.y, taille: z.taille };
}
