// Contenu du QR, partagé par le serveur et le scanner (aucune dépendance).
// CODE_EVENEMENT + « / » + code du billet (base32). Tout en majuscules : mode alphanumérique.
export const contenuQR = (codeEvenement: string, codeBillet: string) => `${codeEvenement}/${codeBillet}`;

export function lireContenuQR(texte: string): { evenement: string; code: string } | null {
  const m = /^([A-Z0-9]{4,12})\/([A-Z2-7]{26})$/.exec(texte.trim().toUpperCase());
  return m ? { evenement: m[1] as string, code: m[2] as string } : null;
}

export const estIdentifiantBillet = (texte: string) => /^ET-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(texte.trim().toUpperCase());
