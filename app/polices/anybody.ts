import { Anybody } from 'next/font/google';

// Option 3 : Anybody, la police de la maquette, moins condensée (90 %) et moins grasse (700).
export const police = Anybody({ subsets: ['latin'], axes: ['wdth'], variable: '--font-titre-anybody', display: 'swap' });
export const nom = 'anybody';
