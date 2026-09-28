// Manifeste de l'application scanner des contrôleurs, installable séparément (portée /scan).
export function GET() {
  return Response.json({
    id: '/scan',
    name: 'e-Ticket Scanner',
    short_name: 'Scanner',
    lang: 'fr',
    start_url: '/scan',
    scope: '/scan',
    display: 'fullscreen',
    orientation: 'portrait',
    background_color: '#14120E',
    theme_color: '#14120E',
    icons: [
      { src: '/icones/scanner-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icones/scanner-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  }, { headers: { 'Content-Type': 'application/manifest+json' } });
}
