// Montants : entiers en CDF. L'USD n'est qu'un affichage indicatif au taux saisi par un administrateur.

const espace = (s: string) => s.replace(/[  ]/g, ' ');

export function formaterNombre(n: number): string {
  return espace(Math.round(n).toLocaleString('fr-FR'));
}

/** « 25 000 CDF », ou « Gratuit » pour 0 (comme la maquette). */
export function cdf(n: number, gratuit = 'Gratuit'): string {
  return n === 0 ? gratuit : `${formaterNombre(n)} CDF`;
}

/** « ≈ 9 USD », ou null si aucun taux n'a été saisi. */
export function usd(n: number, cdfParUsd: number | null | undefined): string | null {
  if (!cdfParUsd || cdfParUsd <= 0 || n <= 0) return null;
  return `≈ ${formaterNombre(Math.max(1, Math.round(n / cdfParUsd)))} USD`;
}

/** Commission en points de base, arrondie au CDF inférieur (l'arrondi profite à l'organisateur). */
export function commission(totalCdf: number, bps: number): number {
  return Math.floor((totalCdf * bps) / 10000);
}
