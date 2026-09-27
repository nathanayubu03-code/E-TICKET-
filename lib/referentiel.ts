// Données de référence créées par le seed de production. Rien d'autre n'est codé en dur.

/** Catégories et couleurs reprises de design/maquette/assets/app.js. */
export const CATEGORIES_REFERENCE = [
  { slug: 'concert', nom: 'Concerts', icone: 'music', fond: '#C8102E', texte: '#FBF5E6', ordre: 1 },
  { slug: 'football', nom: 'Football', icone: 'ball', fond: '#1E8FFF', texte: '#14120E', ordre: 2 },
  { slug: 'festival', nom: 'Festivals', icone: 'tent', fond: '#FFD21F', texte: '#14120E', ordre: 3 },
  { slug: 'conference', nom: 'Conférences', icone: 'mic', fond: '#14120E', texte: '#FFD21F', ordre: 4 },
  { slug: 'spectacle', nom: 'Spectacles', icone: 'mask', fond: '#F1E6CC', texte: '#14120E', ordre: 5 },
] as const;

/**
 * Villes de référence et leur fuseau IANA. La RDC a deux fuseaux :
 * ouest (UTC+1, Africa/Kinshasa) et est (UTC+2, Africa/Lubumbashi).
 * Un administrateur peut en ajouter d'autres.
 */
export const VILLES_REFERENCE = [
  { nom: 'Kinshasa', fuseau: 'Africa/Kinshasa' },
  { nom: 'Matadi', fuseau: 'Africa/Kinshasa' },
  { nom: 'Boma', fuseau: 'Africa/Kinshasa' },
  { nom: 'Kikwit', fuseau: 'Africa/Kinshasa' },
  { nom: 'Lubumbashi', fuseau: 'Africa/Lubumbashi' },
  { nom: 'Kolwezi', fuseau: 'Africa/Lubumbashi' },
  { nom: 'Likasi', fuseau: 'Africa/Lubumbashi' },
  { nom: 'Goma', fuseau: 'Africa/Lubumbashi' },
  { nom: 'Bukavu', fuseau: 'Africa/Lubumbashi' },
  { nom: 'Uvira', fuseau: 'Africa/Lubumbashi' },
  { nom: 'Kisangani', fuseau: 'Africa/Lubumbashi' },
  { nom: 'Bunia', fuseau: 'Africa/Lubumbashi' },
  { nom: 'Mbuji-Mayi', fuseau: 'Africa/Lubumbashi' },
  { nom: 'Kananga', fuseau: 'Africa/Lubumbashi' },
  { nom: 'Kindu', fuseau: 'Africa/Lubumbashi' },
] as const;

export const FUSEAUX = ['Africa/Kinshasa', 'Africa/Lubumbashi'] as const;

/** Paramètres par défaut. */
export const PARAMETRES_DEFAUT = {
  commission_bps: 1000, // 10 %
  limite_billets: 4,
  numeros_marchands: {} as Record<string, string>, // opérateur -> numéro, saisi par un administrateur
} as const;

export const BORNES_COMMISSION_BPS = { min: 0, max: 3000 } as const;
