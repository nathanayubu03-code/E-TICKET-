import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'e-Ticket RDC',
    short_name: 'e-Ticket',
    description: 'Billets de concerts, matchs, festivals et spectacles en RDC. Paiement Mobile Money.',
    lang: 'fr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#FBF5E6',
    theme_color: '#FBF5E6',
    icons: [
      { src: '/icones/icone-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icones/icone-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icones/icone-masquable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [{ name: 'Mes billets', url: '/mes-billets' }],
  };
}
