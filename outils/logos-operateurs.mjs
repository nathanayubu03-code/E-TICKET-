// Recense les logos officiels déposés dans public/operateurs/ et écrit lib/logos-operateurs.json.
// Lancé par npm run logos, et automatiquement avant le build Vercel (vercel-build).
// Un opérateur sans logo garde l'affichage de repli (nom sur sa couleur) : jamais d'image cassée.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';

export const FICHIERS = { AIRTEL: 'airtel-money', MPESA: 'mpesa', ORANGE: 'orange-money', AFRIMONEY: 'afrimoney' };
export const POIDS_MAX = 20 * 1024;

/** Largeur et hauteur d'un PNG, lues dans l'en-tête IHDR. */
export function taillePng(octets) {
  return { largeur: octets.readUInt32BE(16), hauteur: octets.readUInt32BE(20) };
}

export function recenser(dossier = 'public/operateurs') {
  const logos = {};
  const alertes = [];
  for (const [k, nom] of Object.entries(FICHIERS)) {
    const format = ['svg', 'png'].find((f) => existsSync(`${dossier}/${nom}.${f}`));
    if (!format) continue;
    const chemin = `${dossier}/${nom}.${format}`;
    const octets = readFileSync(chemin);
    if (statSync(chemin).size > POIDS_MAX) alertes.push(`${chemin} pèse ${(statSync(chemin).size / 1024).toFixed(1)} ko (maximum 20 ko) : à compresser.`);
    if (format === 'png') {
      const { largeur, hauteur } = taillePng(octets);
      if (largeur !== hauteur || largeur < 256) alertes.push(`${chemin} fait ${largeur} × ${hauteur} px : il faut un carré de 256 × 256 px minimum.`);
    }
    // Empreinte dans l'URL : un logo remplacé n'est pas servi depuis le cache.
    logos[k] = `/operateurs/${nom}.${format}?v=${createHash('sha256').update(octets).digest('hex').slice(0, 8)}`;
  }
  return { logos, alertes };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { logos, alertes } = recenser();
  writeFileSync('lib/logos-operateurs.json', JSON.stringify(logos, null, 2) + '\n');
  console.log(`Logos d'opérateurs : ${Object.keys(logos).length} sur ${Object.keys(FICHIERS).length} (${Object.keys(logos).join(', ') || 'aucun'}).`);
  for (const a of alertes) console.warn(`Attention : ${a}`);
}
