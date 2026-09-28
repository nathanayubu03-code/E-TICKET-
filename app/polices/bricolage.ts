import { Bricolage_Grotesque } from 'next/font/google';

// Option 1 : Bricolage Grotesque, graisse 700. Grotesque à caractère, très lisible en petit.
export const police = Bricolage_Grotesque({ subsets: ['latin'], weight: 'variable', variable: '--font-titre-bricolage', display: 'swap' });
export const nom = 'bricolage';
