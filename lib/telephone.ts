// Numéros congolais : toujours stockés au format +243XXXXXXXXX (9 chiffres après l'indicatif).

/** Normalise un numéro saisi. Renvoie null si ce n'est pas un numéro congolais à 9 chiffres. */
export function normaliserTelephone(saisie: string): string | null {
  let d = saisie.replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  if (d.startsWith('00243')) d = d.slice(5);
  else if (d.startsWith('243') && d.length === 12) d = d.slice(3);
  else if (d.startsWith('0') && d.length === 10) d = d.slice(1);
  if (!/^[1-9]\d{8}$/.test(d)) return null;
  return '+243' + d;
}

/** Chiffres nationaux sans le 0 (9 chiffres) à partir d'un numéro normalisé. */
export function chiffresNationaux(normalise: string): string {
  return normalise.replace(/^\+243/, '');
}

/** Affichage lisible : 97 123 45 67 (groupes de la maquette). */
export function formaterChiffres(chiffres: string): string {
  const d = chiffres.replace(/\D/g, '').slice(0, 9);
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');
}

export function formaterTelephone(normalise: string): string {
  return '+243 ' + formaterChiffres(chiffresNationaux(normalise));
}

/** Masque un numéro pour les écrans d'administration et les journaux : +243 97 *** ** 67. */
export function masquerTelephone(normalise: string): string {
  const d = chiffresNationaux(normalise);
  return `+243 ${d.slice(0, 2)} *** ** ${d.slice(7, 9)}`;
}
