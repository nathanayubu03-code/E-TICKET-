// Écrit docs/traductions/en.md : chaque texte d'interface, en français et en anglais, pour relecture.
// Usage : node outils/doc-traductions.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const fr = JSON.parse(readFileSync('messages/fr.json', 'utf8'));
const en = JSON.parse(readFileSync('messages/en.json', 'utf8'));
const aplatir = (a, p = '') => Object.entries(a).flatMap(([k, v]) => (typeof v === 'string' ? [[p + k, v]] : aplatir(v, `${p}${k}.`)));
const valEn = new Map(aplatir(en));
const cellule = (s) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');

const sections = new Map();
for (const [cle, texte] of aplatir(fr)) {
  const [section] = cle.split('.');
  if (!sections.has(section)) sections.set(section, []);
  sections.get(section).push(`| \`${cle}\` | ${cellule(texte)} | ${cellule(valEn.get(cle) ?? '(manquant)')} |`);
}

const lignes = [
  '# Textes anglais à relire',
  '',
  'Fichier généré par `node outils/doc-traductions.mjs` à partir de `messages/fr.json` et `messages/en.json`. Ne pas modifier à la main : corriger `messages/en.json`, puis relancer le script.',
  '',
  'Consignes suivies : anglais simple et naturel, phrases courtes, même ton que le français, pas de traduction mot à mot. Les mots entre accolades (`{montant}`, `{n}`...) sont remplacés par le site ; les balises `<b>` mettent en gras. Les garder tels quels.',
  '',
  'Hors de ce fichier, aussi à relire :',
  '',
  '- les SMS (`lib/sms/gabarits.ts`) : billets prêts, paiement reçu sans place, référence refusée, liste d\'attente, nouvel événement, code de connexion ;',
  '- le PDF du billet (clés `billet.*` ci-dessous) ;',
  '- les pages Conditions et Confidentialité restent en français (texte juridique à faire valider par un juriste avant toute traduction) ; un visiteur en anglais voit la mention `pages.francaisSeulement`.',
  '',
  `${aplatir(fr).length} textes.`,
  '',
];
for (const [section, rangees] of sections) {
  lignes.push(`## ${section}`, '', '| Clé | Français | Anglais |', '|---|---|---|', ...rangees, '');
}
writeFileSync('docs/traductions/en.md', lignes.join('\n'));
console.log(`docs/traductions/en.md : ${aplatir(fr).length} textes.`);
