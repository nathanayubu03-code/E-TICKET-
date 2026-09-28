// Montants : entiers dans la plus petite unité de leur devise (francs pour le CDF, centimes pour
// l'USD). Un montant n'a de sens qu'avec sa devise : CDF et USD ne sont jamais additionnés,
// et aucun taux n'est appliqué pour passer de l'un à l'autre.
import { localeFormat } from '@/i18n/config';

export const DEVISES = ['CDF', 'USD'] as const;
export type Devise = (typeof DEVISES)[number];
export const estDevise = (v: unknown): v is Devise => v === 'CDF' || v === 'USD';

const espace = (s: string) => s.replace(/[\u202f\u00a0]/g, ' ');

/** « 25 000 » en français, « 25,000 » en anglais. */
export function formaterNombre(n: number, langue?: string): string {
  return espace(Math.round(n).toLocaleString(localeFormat(langue)));
}

/**
 * « 25 000 CDF », « 10 USD », « 10,50 USD » (anglais : « 10.50 USD »).
 * `gratuit` : texte affiché pour 0 (« Gratuit »), sinon « 0 CDF ».
 */
export function montant(n: number, devise: Devise, langue?: string, gratuit?: string): string {
  if (n === 0 && gratuit) return gratuit;
  if (devise === 'CDF') return `${formaterNombre(n, langue)} CDF`;
  const entier = n % 100 === 0;
  const texte = (n / 100).toLocaleString(localeFormat(langue), { minimumFractionDigits: entier ? 0 : 2, maximumFractionDigits: 2 });
  return `${espace(texte)} USD`;
}

/** Raccourci CDF, gardé pour les écrans qui n'affichent que des francs. */
export function cdf(n: number, gratuit = 'Gratuit', langue?: string): string {
  return montant(n, 'CDF', langue, gratuit);
}

/** Prix d'une catégorie : « 25 000 CDF · 10 USD » si l'USD est saisi, sinon le CDF seul (aucun équivalent calculé). */
export function prixDouble(prixCdf: number, prixUsd: number | null | undefined, langue?: string, gratuit?: string): string {
  const franc = montant(prixCdf, 'CDF', langue, gratuit);
  return prixUsd === null || prixUsd === undefined || prixCdf === 0 ? franc : `${franc} · ${montant(prixUsd, 'USD', langue)}`;
}

/** Saisie administrateur « 10 », « 10,5 » ou « 10.50 » (dollars) → centimes. null si invalide. */
export function lireDollars(texte: string): number | null {
  const t = texte.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(Number(t) * 100);
}

/** Commission en points de base, arrondie à l'unité inférieure de la devise (l'arrondi profite à l'organisateur). */
export function commission(total: number, bps: number): number {
  return Math.floor((total * bps) / 10000);
}
