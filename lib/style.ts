import type { CSSProperties } from 'react';

/** Espacement des piles et rangées de la maquette (`--gap`). */
export const ecart = (px: number, autres: CSSProperties = {}): CSSProperties => ({ ['--gap' as string]: `${px}px`, ...autres });
