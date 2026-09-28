export const LANGUES = ['fr', 'en', 'ln', 'sw'] as const;
export type Langue = (typeof LANGUES)[number];
export const LANGUE_PAR_DEFAUT: Langue = 'fr';
export const COOKIE_LANGUE = 'NEXT_LOCALE';
export const NOMS_LANGUES: Record<Langue, string> = { fr: 'FR', en: 'EN', ln: 'LN', sw: 'SW' };
/** Nom complet, lu par les lecteurs d'écran dans le sélecteur. */
export const NOMS_COMPLETS: Record<Langue, string> = { fr: 'Français', en: 'English', ln: 'Lingála', sw: 'Kiswahili' };
export const estLangue = (v: unknown): v is Langue => typeof v === 'string' && (LANGUES as readonly string[]).includes(v);
/**
 * Langue des dates et des nombres. Le lingala et le swahili gardent le format français tant que
 * leurs traductions ne sont pas fournies (même principe que pour les textes).
 */
export const localeFormat = (l: string | undefined): 'fr-FR' | 'en-GB' => (l === 'en' ? 'en-GB' : 'fr-FR');
