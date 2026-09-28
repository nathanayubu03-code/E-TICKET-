import { estLangue, type Langue } from '@/i18n/config';

/** Langue enregistrée (commande, abonnement) ramenée à une langue connue, français par défaut. */
export const langueSure = (v: string | null | undefined): Langue => (estLangue(v) ? v : 'fr');

type ChampTraduisible = 'titre' | 'description' | 'infosPratiques';
type AvecAnglais = Partial<Record<ChampTraduisible | `${ChampTraduisible}En`, string | null>>;

/**
 * Contenu saisi par l'administrateur dans la langue demandée : la version anglaise si elle existe,
 * sinon le français. Aucune traduction automatique.
 */
export function texteEvenement<T extends AvecAnglais>(e: T, champ: ChampTraduisible, langue: string | undefined): string {
  const anglais = langue === 'en' ? e[`${champ}En`]?.trim() : '';
  return anglais || e[champ] || '';
}
