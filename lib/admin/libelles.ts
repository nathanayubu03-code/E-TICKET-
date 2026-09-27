import type { StatutCommande, StatutEvenement } from '@/lib/db';

export const LIBELLES_STATUT: Record<StatutEvenement, string> = {
  BROUILLON: 'Brouillon', A_VALIDER: 'À valider', PUBLIE: 'Publié', COMPLET: 'Complet', ANNULE: 'Annulé', TERMINE: 'Terminé',
};
export const CLASSES_STATUT: Record<StatutEvenement, string> = {
  BROUILLON: 'badge-neutre', A_VALIDER: 'badge-attention', PUBLIE: 'badge-succes', COMPLET: 'badge-info', ANNULE: 'badge-danger', TERMINE: 'badge-neutre',
};
export const LIBELLES_COMMANDE: Record<StatutCommande, string> = {
  EN_ATTENTE: 'En attente', PAYEE: 'Payée', PAYEE_SANS_PLACE: 'Payée sans place', EXPIREE: 'Expirée', ECHOUEE: 'Échouée', ANNULEE: 'Annulée', REMBOURSEE: 'Remboursée',
};
