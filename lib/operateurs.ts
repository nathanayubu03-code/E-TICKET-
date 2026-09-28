// Opérateurs Mobile Money et préfixes de numéros. Fichier de configuration modifiable.
// Les préfixes sont des valeurs de départ À CONFIRMER auprès des opérateurs ou de l'agrégateur ;
// l'utilisateur peut toujours corriger l'opérateur détecté.
import type { Devise } from '@/lib/argent';
import type { Operateur } from '@/generated/prisma/enums';

export interface InfoOperateur {
  k: Operateur;
  nom: string;
  reseau: string;
  prefixes: readonly string[]; // format national avec le 0
  fond: string;
  texte: string;
  ussd: string; // menu à rappeler dans l'aide, vide si inconnu
  /** Devises acceptées. Un opérateur est masqué du choix si la devise sélectionnée n'y figure pas. */
  devises: readonly Devise[];
  /** true tant que l'agrégateur n'a pas confirmé ces devises (docs/paiement.md). */
  devisesAConfirmer: boolean;
}

// Devises : CDF et USD partout, À CONFIRMER avec l'agrégateur (question listée dans docs/paiement.md).
const DEUX_DEVISES = { devises: ['CDF', 'USD'] as const, devisesAConfirmer: true };

export const OPERATEURS: readonly InfoOperateur[] = [
  { k: 'AIRTEL', nom: 'Airtel Money', reseau: 'Airtel', prefixes: ['097', '098', '099'], fond: '#E40000', texte: '#FFFFFF', ussd: '*501#', ...DEUX_DEVISES },
  { k: 'MPESA', nom: 'M-Pesa', reseau: 'Vodacom', prefixes: ['081', '082', '083'], fond: '#007A3D', texte: '#FFFFFF', ussd: '', ...DEUX_DEVISES },
  { k: 'ORANGE', nom: 'Orange Money', reseau: 'Orange', prefixes: ['084', '085', '089', '080'], fond: '#FF7900', texte: '#14120E', ussd: '', ...DEUX_DEVISES },
  // Africell : 090 et 091, à confirmer.
  { k: 'AFRIMONEY', nom: 'Afrimoney', reseau: 'Africell', prefixes: ['090', '091'], fond: '#5A2D82', texte: '#FFFFFF', ussd: '', ...DEUX_DEVISES },
];

export function infoOperateur(k: Operateur): InfoOperateur {
  return OPERATEURS.find((o) => o.k === k) as InfoOperateur;
}

/** Détecte l'opérateur à partir des chiffres nationaux (9 chiffres, sans le 0) ou d'un numéro normalisé. */
export function operateurDuNumero(numero: string): InfoOperateur | null {
  const chiffres = numero.replace(/\D/g, '').replace(/^243/, '').replace(/^0/, '');
  if (chiffres.length < 2) return null;
  const prefixe = '0' + chiffres.slice(0, 2);
  return OPERATEURS.find((o) => o.prefixes.includes(prefixe)) ?? null;
}
