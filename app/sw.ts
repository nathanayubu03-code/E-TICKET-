/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker';
import { NetworkFirst, NetworkOnly, Serwist, type PrecacheEntry, type SerwistGlobalConfig } from 'serwist';

// Service worker d'e-Ticket. Les billets et le scanner doivent s'ouvrir sans réseau :
// leurs pages sont servies depuis le cache quand le réseau manque, leurs données viennent d'IndexedDB.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const pagesHorsLigne = /^\/(mes-billets|b\/[A-Z2-7]{26}|scan(\/[a-z0-9]+)?)$/;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // API : jamais de cache (paiement, scanner, statut). Le scanner garde ses données dans IndexedDB.
    { matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/fichiers/'), handler: new NetworkOnly() },
    // Pages des billets et du scanner : réseau d'abord, cache si le réseau ne répond pas en 4 secondes.
    { matcher: ({ url, sameOrigin }) => sameOrigin && pagesHorsLigne.test(url.pathname), handler: new NetworkFirst({ cacheName: 'pages-hors-ligne', networkTimeoutSeconds: 4 }) },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [{ url: '/hors-ligne', matcher: ({ request }) => request.destination === 'document' }],
  },
});

serwist.addEventListeners();
