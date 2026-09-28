// Montants : entiers en CDF. L'USD n'est qu'un affichage indicatif au taux saisi par un administrateur.
import { localeFormat } from '@/i18n/config';

const espace = (s: string) => s.replace(/[  ]/g, ' ');

/** « 25 000 » en français, « 25,000 » en anglais. */
export function formaterNombre(n: number, langue?: string): string {
  return espace(Math.round(n).toLocaleString(localeFormat(langue)));
}

/** « 25 000 CDF », ou « Gratuit » pour 0 (comme la maquette). */
export function cdf(n: number, gratuit = 'Gratuit', langue?: string): string {
  return n === 0 ? gratuit : `${formaterNombre(n, langue)} CDF`;
}

/** « ≈ 9 USD », ou null si aucun taux n'a été saisi. */
export function usd(n: number, cdfParUsd: number | null | undefined, langue?: string): string | null {
  if (!cdfParUsd || cdfParUsd <= 0 || n <= 0) return null;
  return `≈ ${formaterNombre(Math.max(1, Math.round(n / cdfParUsd)), langue)} USD`;
}

/** Commission en points de base, arrondie au CDF inférieur (l'arrondi profite à l'organisateur). */
export function commission(totalCdf: number, bps: number): number {
  return Math.floor((totalCdf * bps) / 10000);
}
