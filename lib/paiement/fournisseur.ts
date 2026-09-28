// Interface unique des fournisseurs de paiement Mobile Money. Chaque agrégateur ou API directe
// est un adaptateur. Le choix se fait par PAYMENT_PROVIDER (lib/env.ts). Voir docs/paiement.md.
import type { Devise } from '@/lib/argent';
import type { Operateur } from '@/lib/db';

export type StatutNormalise = 'EN_ATTENTE' | 'REUSSI' | 'ECHOUE' | 'EXPIRE';

export interface CommandeAPayer {
  paiementId: string; // notre référence, transmise au fournisseur quand il l'accepte
  codeCommande: string;
  montant: number; // entier, dans la plus petite unité de la devise (francs, centimes)
  devise: Devise; // la demande envoyée à l'opérateur utilise cette devise
  cleIdempotence: string;
}

export interface ResultatInitiation { statut: StatutNormalise; referenceOperateur: string | null; brut: string }
export interface ResultatStatut { statut: StatutNormalise; referenceOperateur: string | null; brut: string }

export interface EvenementWebhook {
  cleDedup: string; // identifiant unique de l'événement chez le fournisseur
  paiementId: string | null; // notre référence si le fournisseur la renvoie
  referenceOperateur: string | null;
  statut: StatutNormalise;
  montant: number | null;
  devise: Devise | null; // null si le fournisseur ne la renvoie pas
  brut: string;
}

export interface RequeteBrute { corps: string; entetes: Headers }

export interface PaymentProvider {
  readonly nom: string;
  /** Demande de paiement envoyée sur le téléphone du client (push USSD). Doit être idempotente sur `cleIdempotence`. */
  initier(commande: CommandeAPayer, numero: string, operateur: Operateur): Promise<ResultatInitiation>;
  /** Interroge le fournisseur sur un paiement dont on n'a pas reçu de webhook. */
  verifierStatut(referenceOperateur: string | null, paiementId: string): Promise<ResultatStatut>;
  /** Vérifie la signature et lit le webhook. Renvoie null si la signature est invalide. */
  verifierWebhook(requete: RequeteBrute): Promise<EvenementWebhook | null>;
  /** Traduit un statut du fournisseur en statut interne. */
  normaliserStatut(brut: string): StatutNormalise;
}

export class PaiementIndisponible extends Error {
  constructor() { super('Aucun fournisseur de paiement configuré'); }
}
