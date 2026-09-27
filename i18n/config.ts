export const LANGUES = ['fr', 'ln', 'sw'] as const;
export type Langue = (typeof LANGUES)[number];
export const LANGUE_PAR_DEFAUT: Langue = 'fr';
export const COOKIE_LANGUE = 'NEXT_LOCALE';
export const NOMS_LANGUES: Record<Langue, string> = { fr: 'FR', ln: 'Lingála', sw: 'Kiswahili' };
export const estLangue = (v: unknown): v is Langue => typeof v === 'string' && (LANGUES as readonly string[]).includes(v);
