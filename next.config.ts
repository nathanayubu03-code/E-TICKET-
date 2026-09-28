import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import withSerwistInit from '@serwist/next';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// Service worker : désactivé en développement (next dev), actif sur le build de production.
const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
  additionalPrecacheEntries: [{ url: '/hors-ligne', revision: process.env.VERCEL_GIT_COMMIT_SHA ?? String(Date.now()) }],
});

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  poweredByHeader: false,
  reactStrictMode: true,
  devIndicators: false,
  // Affiches jusqu'à 8 Mo ; l'origine des actions serveur est contrôlée par Next.js (même hôte uniquement).
  experimental: { serverActions: { bodySizeLimit: '9mb' } },
  serverExternalPackages: ['@node-rs/argon2', 'sharp', 'exceljs', 'pdf-lib'],
};

export default withSerwist(withNextIntl(nextConfig));
